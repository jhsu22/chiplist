import type { PageServerLoad, Actions } from './$types';
import { error, fail, redirect } from '@sveltejs/kit';
import { getSession, getSessionEntries, getPlayers, upsertEntry, removeEntry, deleteSession } from '$lib/db';
import { parseMoney } from '$lib/utils';

export const load: PageServerLoad = async ({ params, platform }) => {
	const db = platform!.env.DB;
	const id = Number(params.id);

	const [session, entries, players] = await Promise.all([
		getSession(db, id),
		getSessionEntries(db, id),
		getPlayers(db)
	]);

	if (!session) error(404, 'Session not found');

	return { session, entries, players };
};

export const actions: Actions = {
	upsert_entry: async ({ params, request, platform }) => {
		const db = platform!.env.DB;
		const session_id = Number(params.id);
		const data = await request.formData();

		const player_id = Number(data.get('player_id'));
		const buy_in = parseMoney(String(data.get('buy_in') ?? '0'));
		const cash_out = parseMoney(String(data.get('cash_out') ?? '0'));

		if (!player_id) return fail(400, { error: 'Player required' });
		if (buy_in < 0 || cash_out < 0) return fail(400, { error: 'Amounts must be non-negative' });

		await upsertEntry(db, session_id, player_id, buy_in, cash_out);
		return { success: true };
	},

	delete_session: async ({ params, platform }) => {
		await deleteSession(platform!.env.DB, Number(params.id));
		redirect(302, '/sessions');
	},

	remove_entry: async ({ params, request, platform }) => {
		const db = platform!.env.DB;
		const session_id = Number(params.id);
		const data = await request.formData();
		const player_id = Number(data.get('player_id'));

		if (!player_id) return fail(400, { error: 'Player required' });
		await removeEntry(db, session_id, player_id);
		return { success: true };
	}
};
