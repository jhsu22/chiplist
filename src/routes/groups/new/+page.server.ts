import type { Actions, PageServerLoad } from './$types';
import { fail, redirect } from '@sveltejs/kit';
import { createGroup, getPlayerByUserId, addGroupMember, createPlayer } from '$lib/db';
import { generateInviteCode } from '$lib/auth';

export const load: PageServerLoad = async ({ locals }) => {
	if (!locals.user) redirect(302, '/login');
	return { user: locals.user };
};

export const actions: Actions = {
	default: async ({ request, locals, platform }) => {
		if (!locals.user) return fail(401, { error: 'Not logged in' });
		const db = platform?.env?.DB;
		if (!db) return fail(503, { error: 'Database unavailable' });

		const data = await request.formData();
		const name = String(data.get('name') ?? '').trim();
		const description = String(data.get('description') ?? '').trim();
		if (!name) return fail(400, { error: 'Group name is required' });

		const invite_code = generateInviteCode();
		const groupId = await createGroup(db, name, description, invite_code, locals.user.id);

		// Ensure user has a linked player (create if missing)
		let player = await getPlayerByUserId(db, locals.user.id);
		if (!player) {
			const playerName = locals.user.display_name || locals.user.username;
			const playerId = await createPlayer(db, playerName);
			await db.prepare('UPDATE players SET user_id = ? WHERE id = ?').bind(locals.user.id, playerId).run();
			player = await getPlayerByUserId(db, locals.user.id);
		}
		if (player) await addGroupMember(db, groupId, player.id);

		redirect(302, `/groups/${groupId}`);
	}
};
