import type { PageServerLoad, Actions } from './$types';
import { error, fail, redirect } from '@sveltejs/kit';
import {
	getGroupById, getGroupMembers, getGroupSessions, getPendingGroupSessions,
	createPlayer, addGroupMember, getPlayers, approveSession, deleteSession, getSession,
	dismissSessionPendingNotification
} from '$lib/db';
import { notifySessionApproved } from '$lib/notifications';

export const load: PageServerLoad = async ({ params, platform, locals }) => {
	if (!locals.user) redirect(302, '/login');

	const db = platform?.env?.DB;
	if (!db) error(503, 'Database unavailable');

	const id = Number(params.id);
	const [group, members, sessions] = await Promise.all([
		getGroupById(db, id),
		getGroupMembers(db, id),
		getGroupSessions(db, id)
	]);

	if (!group) error(404, 'Group not found');

	const isLeader = locals.user.id === group.owner_id;
	const pendingSessions = isLeader ? await getPendingGroupSessions(db, id) : [];

	return { group, members, sessions, pendingSessions, isLeader, user: locals.user };
};

export const actions: Actions = {
	add_member: async ({ params, request, platform, locals }) => {
		if (!locals.user) return fail(401, { add_error: 'Not logged in' });
		const db = platform?.env?.DB;
		if (!db) return fail(503, { add_error: 'Database unavailable' });

		const groupId = Number(params.id);
		const data = await request.formData();
		const playerName = String(data.get('player_name') ?? '').trim();
		if (!playerName) return fail(400, { add_error: 'Enter a player name' });

		const allPlayers = await getPlayers(db);
		const existing = allPlayers.find(p => p.name.toLowerCase() === playerName.toLowerCase());

		let playerId: number;
		if (existing) {
			playerId = existing.id;
		} else {
			playerId = await createPlayer(db, playerName);
		}

		try {
			await addGroupMember(db, groupId, playerId);
		} catch {
			// Already a member
		}

		return { add_success: true };
	},

	approve_session: async ({ params, request, platform, locals }) => {
		if (!locals.user) return fail(401, { error: 'Not logged in' });
		const db = platform?.env?.DB;
		if (!db) return fail(503, { error: 'Database unavailable' });

		const group = await getGroupById(db, Number(params.id));
		if (!group || group.owner_id !== locals.user.id) return fail(403, { error: 'Not authorized' });

		const data = await request.formData();
		const sessionId = Number(data.get('session_id'));
		if (!sessionId) return fail(400, { error: 'Missing session id' });

		const session = await getSession(db, sessionId);
		await approveSession(db, sessionId);
		await dismissSessionPendingNotification(db, sessionId);

		if (session) {
			await notifySessionApproved(db, sessionId, session.name);
		}

		return { approve_success: true };
	},

	reject_session: async ({ params, request, platform, locals }) => {
		if (!locals.user) return fail(401, { error: 'Not logged in' });
		const db = platform?.env?.DB;
		if (!db) return fail(503, { error: 'Database unavailable' });

		const group = await getGroupById(db, Number(params.id));
		if (!group || group.owner_id !== locals.user.id) return fail(403, { error: 'Not authorized' });

		const data = await request.formData();
		const sessionId = Number(data.get('session_id'));
		if (!sessionId) return fail(400, { error: 'Missing session id' });

		await deleteSession(db, sessionId);
		return { reject_success: true };
	},
};
