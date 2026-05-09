import type { PageServerLoad, Actions } from './$types';
import { error, fail } from '@sveltejs/kit';
import { getGroupById, getGroupMembers, getGroupSessions, createPlayer, addGroupMember, getPlayers } from '$lib/db';

export const load: PageServerLoad = async ({ params, platform, locals }) => {
	const db = platform?.env?.DB;
	if (!db) error(503, 'Database unavailable');

	const id = Number(params.id);
	const [group, members, sessions] = await Promise.all([
		getGroupById(db, id),
		getGroupMembers(db, id),
		getGroupSessions(db, id)
	]);

	if (!group) error(404, 'Group not found');

	return { group, members, sessions, user: locals.user };
};

export const actions: Actions = {
	add_member: async ({ params, request, platform }) => {
		const db = platform?.env?.DB;
		if (!db) return fail(503, { add_error: 'Database unavailable' });

		const groupId = Number(params.id);
		const data = await request.formData();
		const playerName = String(data.get('player_name') ?? '').trim();
		if (!playerName) return fail(400, { add_error: 'Enter a player name' });

		// Look for existing player with that name (case-insensitive)
		const allPlayers = await getPlayers(db);
		const existing = allPlayers.find(p => p.name.toLowerCase() === playerName.toLowerCase());

		let playerId: number;
		if (existing) {
			playerId = existing.id;
		} else {
			playerId = await createPlayer(db, playerName);
		}

		// Upsert — addGroupMember has UNIQUE constraint, so wrap in try/catch
		try {
			await addGroupMember(db, groupId, playerId);
		} catch {
			// Already a member — not an error
		}

		return { add_success: true };
	}
};
