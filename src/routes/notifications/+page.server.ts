import type { PageServerLoad, Actions } from './$types';
import { redirect, fail } from '@sveltejs/kit';
import {
	getEnrichedNotifications,
	markAllNotificationsRead,
	markNotificationRead,
	getSettlement,
	updateSettlementStatus,
	createNotification,
	getPlayer,
	clearResolvedNotifications
} from '$lib/db';
import { formatMoney } from '$lib/utils';

export const load: PageServerLoad = async ({ platform, locals }) => {
	if (!locals.user) redirect(302, '/login');

	const db = platform?.env?.DB;
	if (!db) return { notifications: [] };

	// Mark all as read after loading so badge clears on next navigation
	const notifications = await getEnrichedNotifications(db, locals.user.id);
	await markAllNotificationsRead(db, locals.user.id);

	return { notifications };
};

export const actions: Actions = {
	clear_resolved: async ({ platform, locals }) => {
		if (!locals.user) return fail(401, { error: 'Not logged in' });
		const db = platform?.env?.DB;
		if (!db) return fail(503, { error: 'Database unavailable' });
		await clearResolvedNotifications(db, locals.user.id);
		return { cleared: true };
	},

	mark_sent: async ({ request, platform, locals }) => {
		if (!locals.user) return fail(401, { error: 'Not logged in' });
		const db = platform?.env?.DB;
		if (!db) return fail(503, { error: 'Database unavailable' });

		const data = await request.formData();
		const settlementId = Number(data.get('settlement_id'));
		const notificationId = Number(data.get('notification_id'));
		if (!settlementId) return fail(400, { error: 'Missing settlement id' });

		const settlement = await getSettlement(db, settlementId);
		if (!settlement) return fail(404, { error: 'Settlement not found' });
		if (settlement.status !== 'pending') return fail(400, { error: 'Already actioned' });

		// Verify user is the debtor
		const fromPlayer = await getPlayer(db, settlement.from_player_id);
		if (!fromPlayer || fromPlayer.user_id !== locals.user.id) {
			return fail(403, { error: 'Not authorized' });
		}

		await updateSettlementStatus(db, settlementId, 'sent');
		if (notificationId) await markNotificationRead(db, notificationId);

		// Notify the creditor
		const toPlayer = await getPlayer(db, settlement.to_player_id);
		if (toPlayer?.user_id) {
			await createNotification(
				db,
				toPlayer.user_id,
				'payment_sent',
				`${fromPlayer.name} sent you money`,
				`${formatMoney(settlement.amount)} — tap to confirm receipt`,
				settlementId
			);
		}

		return { success: true };
	},

	confirm_received: async ({ request, platform, locals }) => {
		if (!locals.user) return fail(401, { error: 'Not logged in' });
		const db = platform?.env?.DB;
		if (!db) return fail(503, { error: 'Database unavailable' });

		const data = await request.formData();
		const settlementId = Number(data.get('settlement_id'));
		const notificationId = Number(data.get('notification_id'));
		if (!settlementId) return fail(400, { error: 'Missing settlement id' });

		const settlement = await getSettlement(db, settlementId);
		if (!settlement) return fail(404, { error: 'Settlement not found' });
		if (settlement.status !== 'sent') return fail(400, { error: 'Payment not marked as sent yet' });

		// Verify user is the creditor
		const toPlayer = await getPlayer(db, settlement.to_player_id);
		if (!toPlayer || toPlayer.user_id !== locals.user.id) {
			return fail(403, { error: 'Not authorized' });
		}

		await updateSettlementStatus(db, settlementId, 'resolved');
		if (notificationId) await markNotificationRead(db, notificationId);

		// Notify the debtor that payment was confirmed
		const fromPlayer = await getPlayer(db, settlement.from_player_id);
		if (fromPlayer?.user_id) {
			await createNotification(
				db,
				fromPlayer.user_id,
				'payment_confirmed',
				`${toPlayer.name} confirmed your payment`,
				`${formatMoney(settlement.amount)} — all settled`,
				settlementId
			);
		}

		return { success: true };
	},
};
