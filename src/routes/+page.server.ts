import type { PageServerLoad } from './$types';
import { redirect } from '@sveltejs/kit';
import {
	getPlayers, getSessions, getSessionEntries,
	getPlayerByUserId, getPlayerEntries,
	getUserGroups, getGroupMembers, getGroupSessions
} from '$lib/db';

export const load: PageServerLoad = async ({ platform, locals }) => {
	if (!locals.user) redirect(302, '/login');

	const db = platform?.env?.DB;
	if (!db) return {
		leaderboard: [], recent_sessions: [],
		total_sessions: 0, total_players: 0,
		user_stats: null, groups: []
	};

	const [players, sessions] = await Promise.all([getPlayers(db), getSessions(db)]);
	const allEntries = await Promise.all(sessions.map(s => getSessionEntries(db, s.id)));
	const flat = allEntries.flat();

	// Global leaderboard
	const statsMap = new Map<number, { sessions: number; buy_in: number; cash_out: number; wins: number }>();
	for (const e of flat) {
		const c = statsMap.get(e.player_id) ?? { sessions: 0, buy_in: 0, cash_out: 0, wins: 0 };
		c.sessions++; c.buy_in += e.buy_in; c.cash_out += e.cash_out;
		if (e.cash_out > e.buy_in) c.wins++;
		statsMap.set(e.player_id, c);
	}
	const leaderboard = players
		.map(p => {
			const s = statsMap.get(p.id) ?? { sessions: 0, buy_in: 0, cash_out: 0, wins: 0 };
			return { ...p, sessions: s.sessions, net_profit: s.cash_out - s.buy_in,
				win_rate: s.sessions > 0 ? s.wins / s.sessions : 0,
				avg: s.sessions > 0 ? Math.round((s.cash_out - s.buy_in) / s.sessions) : 0 };
		})
		.sort((a, b) => b.net_profit - a.net_profit);

	// Recent sessions with top winner
	const recentSessions = sessions.slice(0, 3).map((s, i) => {
		const entries = allEntries[i] ?? [];
		const top = entries.reduce((best, e) => {
			const net = e.cash_out - e.buy_in;
			return net > best.net ? { name: e.player_name, net } : best;
		}, { name: '', net: -Infinity });
		return { ...s, top_winner: top.net > -Infinity ? top : null };
	});

	// Per-user stats + group leaderboards
	let user_stats: {
		player: typeof players[0] | null;
		net_profit: number; sessions_played: number;
		win_rate: number; avg_profit: number; last_profit: number | null;
	} | null = null;
	let groups: Array<{
		id: number; name: string; invite_code: string;
		members: Awaited<ReturnType<typeof getGroupMembers>>;
		session_count: number;
	}> = [];

	if (locals.user) {
		const userPlayer = await getPlayerByUserId(db, locals.user.id);

		if (userPlayer) {
			const entries = await getPlayerEntries(db, userPlayer.id);
			const net_profit = entries.reduce((s, e) => s + (e.cash_out - e.buy_in), 0);
			const wins = entries.filter(e => e.cash_out > e.buy_in).length;
			user_stats = {
				player: userPlayer,
				net_profit,
				sessions_played: entries.length,
				win_rate: entries.length > 0 ? wins / entries.length : 0,
				avg_profit: entries.length > 0 ? Math.round(net_profit / entries.length) : 0,
				last_profit: entries[0] ? entries[0].cash_out - entries[0].buy_in : null,
			};
		} else {
			user_stats = { player: null, net_profit: 0, sessions_played: 0, win_rate: 0, avg_profit: 0, last_profit: null };
		}

		const userGroups = await getUserGroups(db, locals.user.id);
		const groupData = await Promise.all(userGroups.map(async g => {
			const [members, groupSessions] = await Promise.all([
				getGroupMembers(db, g.id),
				getGroupSessions(db, g.id),
			]);
			return { ...g, members: members.sort((a, b) => b.net_profit - a.net_profit), session_count: groupSessions.length };
		}));
		// Most active group first
		groups = groupData.sort((a, b) => b.session_count - a.session_count);
	}

	return {
		leaderboard, recent_sessions: recentSessions,
		total_sessions: sessions.length, total_players: players.length,
		user_stats, groups,
	};
};
