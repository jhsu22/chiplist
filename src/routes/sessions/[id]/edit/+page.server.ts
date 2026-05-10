import type { PageServerLoad, Actions } from './$types';
import { error, fail, redirect } from '@sveltejs/kit';
import { getSession, getSessionEntries, getPlayers, updateSession, upsertEntry, getGroupById } from '$lib/db';
import { parseMoney } from '$lib/utils';

export const load: PageServerLoad = async ({ params, platform, locals }) => {
	if (!locals.user) redirect(302, '/login');
	const db = platform!.env.DB;
	const id = Number(params.id);

	const [session, entries, players] = await Promise.all([
		getSession(db, id),
		getSessionEntries(db, id),
		getPlayers(db),
	]);

	if (!session) error(404, 'Session not found');

	if (session.group_id) {
		const group = await getGroupById(db, session.group_id);
		if (group?.owner_id !== locals.user.id) redirect(302, `/sessions/${id}`);
	}

	return { session, entries, players };
};

export const actions: Actions = {
	default: async ({ params, request, platform, locals }) => {
		if (!locals.user) return fail(401, { error: 'Not logged in' });
		const db = platform!.env.DB;
		const id = Number(params.id);

		const session = await getSession(db, id);
		if (session?.group_id) {
			const group = await getGroupById(db, session.group_id);
			if (group?.owner_id !== locals.user.id) return fail(403, { error: 'Only the group leader can edit this session' });
		}

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
