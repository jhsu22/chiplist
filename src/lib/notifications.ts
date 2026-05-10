import type { D1Database } from '@cloudflare/workers-types';
import { getSessionEntries, getPlayer, createNotification, createSettlement, getPushSubscriptions } from './db';
import { calculateSettlements, formatMoney } from './utils';
import { sendWebPush } from './webpush';

type VapidEnv = {
	VAPID_PUBLIC_KEY?: string;
	VAPID_PRIVATE_KEY?: string;
	VAPID_SUBJECT?: string;
};

async function pushToUser(
	db: D1Database,
	env: VapidEnv | undefined,
	user_id: number,
	title: string,
	body: string,
	url = '/notifications'
): Promise<void> {
	if (!env?.VAPID_PUBLIC_KEY || !env?.VAPID_PRIVATE_KEY || !env?.VAPID_SUBJECT) return;
	const subs = await getPushSubscriptions(db, user_id);
	await Promise.allSettled(
		subs.map((sub) =>
			sendWebPush(sub, { title, body, url }, env.VAPID_PUBLIC_KEY!, env.VAPID_PRIVATE_KEY!, env.VAPID_SUBJECT!)
		)
	);
}

export async function notifySessionApproved(
	db: D1Database,
	sessionId: number,
	sessionName: string,
	env?: VapidEnv
): Promise<void> {
	const entries = await getSessionEntries(db, sessionId);
	if (entries.length === 0) return;

	for (const entry of entries) {
		const player = await getPlayer(db, entry.player_id);
		if (player?.user_id) {
			const title = 'Session logged';
			const body = `"${sessionName}" results are in`;
			await createNotification(db, player.user_id, 'session_approved', title, body, sessionId);
			await pushToUser(db, env, player.user_id, title, body, `/sessions/${sessionId}`);
		}
	}

	const inputs = entries.map((e) => ({ player: e.player_name, net: e.cash_out - e.buy_in }));
	const settlements = calculateSettlements(inputs);

	for (const s of settlements) {
		const fromEntry = entries.find((e) => e.player_name === s.from_player);
		const toEntry = entries.find((e) => e.player_name === s.to_player);
		if (!fromEntry || !toEntry) continue;

		const settlementId = await createSettlement(db, sessionId, fromEntry.player_id, toEntry.player_id, s.amount);

		const fromPlayer = await getPlayer(db, fromEntry.player_id);
		if (fromPlayer?.user_id) {
			const title = `You owe ${s.to_player}`;
			const body = `${formatMoney(s.amount)} from "${sessionName}"`;
			await createNotification(db, fromPlayer.user_id, 'you_owe', title, body, settlementId);
			await pushToUser(db, env, fromPlayer.user_id, title, body);
		}
	}
}

export async function notifyGroupLeaderPending(
	db: D1Database,
	sessionId: number,
	sessionName: string,
	leaderUserId: number,
	env?: VapidEnv
): Promise<void> {
	const title = 'Session needs your approval';
	const body = `"${sessionName}" is waiting for review`;
	await createNotification(db, leaderUserId, 'session_pending', title, body, sessionId);
	await pushToUser(db, env, leaderUserId, title, body, '/notifications');
}
