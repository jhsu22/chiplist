import type { D1Database } from '@cloudflare/workers-types';
import { getSessionEntries, getPlayer, createNotification, createSettlement } from './db';
import { calculateSettlements, formatMoney } from './utils';

/**
 * Called after a session is approved (or created as approved).
 * Creates settlement records and fires notifications for participants and debtors.
 */
export async function notifySessionApproved(
	db: D1Database,
	sessionId: number,
	sessionName: string
): Promise<void> {
	const entries = await getSessionEntries(db, sessionId);
	if (entries.length === 0) return;

	// Notify every participant that the session is logged
	for (const entry of entries) {
		const player = await getPlayer(db, entry.player_id);
		if (player?.user_id) {
			await createNotification(
				db,
				player.user_id,
				'session_approved',
				'Session logged',
				`"${sessionName}" results are in`,
				sessionId
			);
		}
	}

	// Compute minimal settlements and create records
	const inputs = entries.map(e => ({ player: e.player_name, net: e.cash_out - e.buy_in }));
	const settlements = calculateSettlements(inputs);

	for (const s of settlements) {
		const fromEntry = entries.find(e => e.player_name === s.from_player);
		const toEntry = entries.find(e => e.player_name === s.to_player);
		if (!fromEntry || !toEntry) continue;

		const settlementId = await createSettlement(
			db,
			sessionId,
			fromEntry.player_id,
			toEntry.player_id,
			s.amount
		);

		// Notify the debtor
		const fromPlayer = await getPlayer(db, fromEntry.player_id);
		if (fromPlayer?.user_id) {
			await createNotification(
				db,
				fromPlayer.user_id,
				'you_owe',
				`You owe ${s.to_player}`,
				`${formatMoney(s.amount)} from "${sessionName}"`,
				settlementId
			);
		}
	}
}

/**
 * Called when a non-leader submits a session to a group.
 * Notifies the group leader that approval is needed.
 */
export async function notifyGroupLeaderPending(
	db: D1Database,
	sessionId: number,
	sessionName: string,
	leaderUserId: number
): Promise<void> {
	await createNotification(
		db,
		leaderUserId,
		'session_pending',
		'Session needs your approval',
		`"${sessionName}" is waiting for review`,
		sessionId
	);
}
