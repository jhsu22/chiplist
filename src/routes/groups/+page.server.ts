import type { PageServerLoad, Actions } from './$types';
import { fail } from '@sveltejs/kit';
import {
	getUserGroups, getGroupMembers, getGroupByInviteCode,
	addGroupMember, getPlayerByUserId, createPlayer
} from '$lib/db';

export const load: PageServerLoad = async ({ locals, platform }) => {
	if (!locals.user) return { user: null, groups: [] };

	const db = platform?.env?.DB;
	if (!db) return { user: locals.user, groups: [] };

	const groups = await getUserGroups(db, locals.user.id);

	const groupsWithCount = await Promise.all(
		groups.map(async (g) => {
			const members = await getGroupMembers(db, g.id);
			return { ...g, member_count: members.length };
		})
	);

	return { user: locals.user, groups: groupsWithCount };
};

export const actions: Actions = {
	join_group: async ({ request, locals, platform }) => {
		if (!locals.user) return fail(401, { join_error: 'Not logged in' });
		const db = platform?.env?.DB;
		if (!db) return fail(503, { join_error: 'Database unavailable' });

		const data = await request.formData();
		const invite_code = String(data.get('invite_code') ?? '').trim().toUpperCase();
		if (!invite_code) return fail(400, { join_error: 'Enter an invite code' });

		const group = await getGroupByInviteCode(db, invite_code);
		if (!group) return fail(404, { join_error: 'No group found with that code' });

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

		return { join_success: true, group_id: group.id };
	}
};
