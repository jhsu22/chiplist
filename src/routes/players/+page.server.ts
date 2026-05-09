import type { PageServerLoad, Actions } from './$types';
import { getPlayers, createPlayer, deletePlayer, getSessions, getSessionEntries } from '$lib/db';
import { fail, redirect } from '@sveltejs/kit';

export const load: PageServerLoad = async ({ platform, locals }) => {
	if (!locals.user) redirect(302, '/login');
	const db = platform!.env.DB;
	const [players, sessions] = await Promise.all([getPlayers(db), getSessions(db)]);

	const allEntries = await Promise.all(sessions.map((s) => getSessionEntries(db, s.id)));
	const flat = allEntries.flat();

	const statsMap = new Map<number, { sessions: number; buy_in: number; cash_out: number; wins: number }>();
	for (const entry of flat) {
		const curr = statsMap.get(entry.player_id) ?? { sessions: 0, buy_in: 0, cash_out: 0, wins: 0 };
		curr.sessions++;
		curr.buy_in += entry.buy_in;
		curr.cash_out += entry.cash_out;
		if (entry.cash_out > entry.buy_in) curr.wins++;
		statsMap.set(entry.player_id, curr);
	}

	const withStats = players
		.map((p) => {
			const s = statsMap.get(p.id) ?? { sessions: 0, buy_in: 0, cash_out: 0, wins: 0 };
			return {
				...p,
				sessions: s.sessions,
				net_profit: s.cash_out - s.buy_in,
				win_rate: s.sessions > 0 ? s.wins / s.sessions : 0,
				avg: s.sessions > 0 ? Math.round((s.cash_out - s.buy_in) / s.sessions) : 0,
			};
		})
		.sort((a, b) => b.net_profit - a.net_profit);

	return { players: withStats };
};

export const actions: Actions = {
	create: async ({ request, platform }) => {
		const data = await request.formData();
		const name = String(data.get('name') ?? '').trim();
		if (!name) return fail(400, { error: 'Name is required' });
		try {
			await createPlayer(platform!.env.DB, name);
		} catch {
			return fail(400, { error: 'A player with that name already exists' });
		}
		return { success: true };
	},
	delete: async ({ request, platform }) => {
		const data = await request.formData();
		const id = Number(data.get('id'));
		if (!id) return fail(400, { error: 'Missing id' });
		await deletePlayer(platform!.env.DB, id);
		return { success: true };
	}
};
