import type { PageServerLoad, Actions } from './$types';
import { getSessions, getSessionEntries, deleteSession } from '$lib/db';
import { fail } from '@sveltejs/kit';

export const load: PageServerLoad = async ({ platform }) => {
	const db = platform!.env.DB;
	const sessions = await getSessions(db);
	const allEntries = await Promise.all(sessions.map((s) => getSessionEntries(db, s.id)));

	const sessionsWithTop = sessions.map((s, i) => {
		const entries = allEntries[i] ?? [];
		const top = entries.reduce(
			(best, e) => {
				const net = e.cash_out - e.buy_in;
				return net > best.net ? { name: e.player_name, net } : best;
			},
			{ name: '', net: -Infinity }
		);
		const playerCount = entries.length;
		return { ...s, top_winner: top.net > -Infinity ? top : null, player_count: playerCount };
	});

	const totalVolume = allEntries.flat().reduce((s, e) => s + e.buy_in, 0);

	return { sessions: sessionsWithTop, total_volume: totalVolume };
};

export const actions: Actions = {
	delete: async ({ request, platform }) => {
		const data = await request.formData();
		const id = Number(data.get('id'));
		if (!id) return fail(400, { error: 'Missing id' });
		await deleteSession(platform!.env.DB, id);
		return { success: true };
	}
};
