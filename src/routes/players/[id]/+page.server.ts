import type { PageServerLoad } from './$types';
import { error, redirect } from '@sveltejs/kit';
import { getPlayer, getPlayerEntries } from '$lib/db';

export const load: PageServerLoad = async ({ params, platform, locals }) => {
	if (!locals.user) redirect(302, '/login');
	const db = platform!.env.DB;
	const id = Number(params.id);

	const [player, entries] = await Promise.all([getPlayer(db, id), getPlayerEntries(db, id)]);

	if (!player) error(404, 'Player not found');

	const sessions_played = entries.length;
	const total_buy_in = entries.reduce((s, e) => s + e.buy_in, 0);
	const total_cash_out = entries.reduce((s, e) => s + e.cash_out, 0);
	const net_profit = total_cash_out - total_buy_in;
	const wins = entries.filter((e) => e.cash_out > e.buy_in).length;
	const win_rate = sessions_played > 0 ? wins / sessions_played : 0;
	const avg_profit = sessions_played > 0 ? net_profit / sessions_played : 0;
	const biggest_win = entries.reduce((max, e) => Math.max(max, e.cash_out - e.buy_in), 0);
	const biggest_loss = entries.reduce((min, e) => Math.min(min, e.cash_out - e.buy_in), 0);

	// Build cumulative profit series for chart
	const sorted = [...entries].reverse(); // oldest first
	let running = 0;
	const chart_data = sorted.map((e) => {
		running += e.cash_out - e.buy_in;
		return { date: e.session_date, label: e.session_name, value: running };
	});

	return {
		player,
		entries,
		stats: {
			sessions_played,
			net_profit,
			win_rate,
			avg_profit,
			biggest_win,
			biggest_loss
		},
		chart_data
	};
};
