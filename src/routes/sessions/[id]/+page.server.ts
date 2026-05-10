import type { PageServerLoad, Actions } from './$types';
import { error, fail, redirect } from '@sveltejs/kit';

import { getSession, getSessionEntries, getPlayers, getSessionSettlements, upsertEntry, removeEntry, deleteSession, getGroupById } from '$lib/db';
import { parseMoney } from '$lib/utils';

async function resolveLeaderStatus(db: import('@cloudflare/workers-types').D1Database, session: import('$lib/types').Session | null, userId: number): Promise<boolean> {
	if (!session?.group_id) return true; // non-group sessions have no restriction
	const group = await getGroupById(db, session.group_id);
	return group?.owner_id === userId;
}

export const load: PageServerLoad = async ({ params, platform, locals }) => {
	if (!locals.user) redirect(302, '/login');
	const db = platform!.env.DB;
	const id = Number(params.id);

	const [session, entries, players, settlements] = await Promise.all([
		getSession(db, id),
		getSessionEntries(db, id),
		getPlayers(db),
		getSessionSettlements(db, id)
	]);

	if (!session) error(404, 'Session not found');

	const isLeader = await resolveLeaderStatus(db, session, locals.user.id);

	return { session, entries, players, settlements, isLeader };
};

export const actions: Actions = {
	upsert_entry: async ({ params, request, platform, locals }) => {
		if (!locals.user) return fail(401, { error: 'Not logged in' });
		const db = platform!.env.DB;
		const session_id = Number(params.id);

		const session = await getSession(db, session_id);
		if (!await resolveLeaderStatus(db, session, locals.user.id)) {
			return fail(403, { error: 'Only the group leader can edit entries' });
		}

		const data = await request.formData();
		const player_id = Number(data.get('player_id'));
		const buy_in = parseMoney(String(data.get('buy_in') ?? '0'));
		const cash_out = parseMoney(String(data.get('cash_out') ?? '0'));

		if (!player_id) return fail(400, { error: 'Player required' });
		if (buy_in < 0 || cash_out < 0) return fail(400, { error: 'Amounts must be non-negative' });

		await upsertEntry(db, session_id, player_id, buy_in, cash_out);
		return { success: true };
	},

	delete_session: async ({ params, platform, locals }) => {
		if (!locals.user) return fail(401, { error: 'Not logged in' });
		const db = platform!.env.DB;
		const session_id = Number(params.id);

		const session = await getSession(db, session_id);
		if (!await resolveLeaderStatus(db, session, locals.user.id)) {
			return fail(403, { error: 'Only the group leader can delete this session' });
		}

		await deleteSession(db, session_id);
		redirect(302, '/sessions');
	},

	remove_entry: async ({ params, request, platform, locals }) => {
		if (!locals.user) return fail(401, { error: 'Not logged in' });
		const db = platform!.env.DB;
		const session_id = Number(params.id);

		const session = await getSession(db, session_id);
		if (!await resolveLeaderStatus(db, session, locals.user.id)) {
			return fail(403, { error: 'Only the group leader can edit entries' });
		}

		const data = await request.formData();
		const player_id = Number(data.get('player_id'));
		if (!player_id) return fail(400, { error: 'Player required' });

		await removeEntry(db, session_id, player_id);
		return { success: true };
	}
};
