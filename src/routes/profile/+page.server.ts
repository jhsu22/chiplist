import type { Actions, PageServerLoad } from './$types';
import { fail, redirect } from '@sveltejs/kit';
import { deleteAuthSession } from '$lib/db';
import {
	getPlayers, getPlayerByUserId, updateUserDisplayName,
	getUserGroups, getGroupByInviteCode, addGroupMember, createPlayer, deleteUserAccount
} from '$lib/db';

export const load: PageServerLoad = async ({ locals, platform }) => {
	if (!locals.user) redirect(302, '/login');

	const db = platform?.env?.DB;
	if (!db) return { user: locals.user, players: [], linkedPlayer: null, groups: [] };

	const [linkedPlayer, groups] = await Promise.all([
		getPlayerByUserId(db, locals.user.id),
		getUserGroups(db, locals.user.id),
	]);

	return { user: locals.user, linkedPlayer, groups };
};

export const actions: Actions = {
	update_profile: async ({ request, locals, platform }) => {
		if (!locals.user) return fail(401, { error: 'Not logged in' });
		const db = platform?.env?.DB;
		if (!db) return fail(503, { error: 'Database unavailable' });

		const data = await request.formData();
		const display_name = String(data.get('display_name') ?? '').trim();
		if (!display_name) return fail(400, { update_error: 'Display name cannot be empty' });

		await updateUserDisplayName(db, locals.user.id, display_name);
		return { update_success: true };
	},

	join_group: async ({ request, locals, platform }) => {
		if (!locals.user) return fail(401, { error: 'Not logged in' });
		const db = platform?.env?.DB;
		if (!db) return fail(503, { error: 'Database unavailable' });

		const data = await request.formData();
		const invite_code = String(data.get('invite_code') ?? '').trim().toUpperCase();
		if (!invite_code) return fail(400, { join_error: 'Enter an invite code' });

		const group = await getGroupByInviteCode(db, invite_code);
		if (!group) return fail(404, { join_error: 'No group found with that code' });

		// Ensure user has a linked player (create if missing)
		let player = await getPlayerByUserId(db, locals.user.id);
		if (!player) {
			const playerName = locals.user.display_name || locals.user.username;
			const playerId = await createPlayer(db, playerName);
			await db.prepare('UPDATE players SET user_id = ? WHERE id = ?').bind(locals.user.id, playerId).run();
			player = await getPlayerByUserId(db, locals.user.id);
		}

		if (!player) return fail(500, { join_error: 'Could not create player profile' });

		try {
			await addGroupMember(db, group.id, player.id);
		} catch {
			// Already a member
		}

		return { join_success: true };
	},

	delete_account: async ({ locals, platform, cookies }) => {
		if (!locals.user) return fail(401, { error: 'Not logged in' });
		const db = platform?.env?.DB;
		if (!db) return fail(503, { error: 'Database unavailable' });

		const token = cookies.get('chiplist_session');
		if (token) await deleteAuthSession(db, token);
		cookies.delete('chiplist_session', { path: '/' });

		await deleteUserAccount(db, locals.user.id);
		redirect(302, '/login');
	}
};
