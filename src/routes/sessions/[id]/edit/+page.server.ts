import type { PageServerLoad, Actions } from './$types';
import { error, fail, redirect } from '@sveltejs/kit';
import { getSession, getSessionEntries, getPlayers, updateSession, upsertEntry } from '$lib/db';
import { parseMoney } from '$lib/utils';

export const load: PageServerLoad = async ({ params, platform }) => {
	const db = platform!.env.DB;
	const id = Number(params.id);

	const [session, entries, players] = await Promise.all([
		getSession(db, id),
		getSessionEntries(db, id),
		getPlayers(db),
	]);

	if (!session) error(404, 'Session not found');

	return { session, entries, players };
};

export const actions: Actions = {
	default: async ({ params, request, platform }) => {
		const db = platform!.env.DB;
		const id = Number(params.id);
		const data = await request.formData();

		const location = String(data.get('location') ?? '').trim();
		const date = String(data.get('date') ?? '').trim();
		const blinds = String(data.get('blinds') ?? '').trim();
		const hours = parseFloat(String(data.get('hours') ?? '0'));
		const entriesRaw = String(data.get('entries') ?? '[]');

		if (!date) return fail(400, { error: 'Date is required' });

		let entries: { player_id: number; buy_in_cents: number; cash_out_cents: number }[] = [];
		try {
			entries = JSON.parse(entriesRaw);
		} catch {
			return fail(400, { error: 'Invalid entries data' });
		}

		await updateSession(db, id, {
			name: location || 'Game Night',
			date,
			location: location || null,
			blinds: blinds || null,
			hours: isNaN(hours) ? null : hours,
			notes: null,
		});

		for (const entry of entries) {
			await upsertEntry(db, id, entry.player_id, entry.buy_in_cents, entry.cash_out_cents);
		}

		redirect(302, `/sessions/${id}`);
	}
};
