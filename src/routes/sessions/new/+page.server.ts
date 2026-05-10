import type { Actions, PageServerLoad } from './$types';
import { getPlayers, createSession, upsertEntry, getUserGroups, getGroupMembers, getGroupById } from '$lib/db';
import { notifySessionApproved, notifyGroupLeaderPending } from '$lib/notifications';
import { fail, redirect } from '@sveltejs/kit';

export const load: PageServerLoad = async ({ platform, locals }) => {
	if (!locals.user) redirect(302, '/login');

	const db = platform?.env?.DB;
	if (!db) return { players: [], groups: [] };

	const players = await getPlayers(db);
	const rawGroups = await getUserGroups(db, locals.user.id);

	const groups = await Promise.all(rawGroups.map(async g => {
		const members = await getGroupMembers(db, g.id);
		return {
			...g,
			member_ids: members.map(m => m.player_id),
			member_names: members.map(m => ({ id: m.player_id, name: m.player_name })),
			is_leader: g.owner_id === locals.user!.id,
		};
	}));

	return { players, groups };
};

export const actions: Actions = {
	default: async ({ request, platform, locals }) => {
		if (!locals.user) return fail(401, { error: 'Not logged in' });
		const db = platform?.env?.DB;
		if (!db) return fail(503, { error: 'Database unavailable' });

		const data = await request.formData();

		const location = String(data.get('location') ?? '').trim();
		const date = String(data.get('date') ?? '').trim();
		const blinds = String(data.get('blinds') ?? '').trim();
		const hours = parseFloat(String(data.get('hours') ?? '0'));
		const buyIn = parseFloat(String(data.get('buy_in') ?? '200'));
		const entriesRaw = String(data.get('entries') ?? '[]');
		const groupIdRaw = String(data.get('group_id') ?? '').trim();
		const group_id = groupIdRaw ? Number(groupIdRaw) : null;

		if (!date) return fail(400, { error: 'Date is required' });

		let entries: { player_id: number; net: number }[] = [];
		try {
			entries = JSON.parse(entriesRaw);
		} catch {
			return fail(400, { error: 'Invalid entries data' });
		}

		const name = location || `Game Night`;

		// Non-leaders submitting to a group get pending status
		let status = 'approved';
		let groupOwnerId: number | null = null;
		if (group_id) {
			const group = await getGroupById(db, group_id);
			if (group && group.owner_id !== locals.user.id) {
				status = 'pending';
			}
			groupOwnerId = group?.owner_id ?? null;
		}

		const id = await createSession(db, {
			name,
			date,
			location: location || null,
			blinds: blinds || null,
			hours: isNaN(hours) ? null : hours,
			notes: null,
			group_id: group_id || null,
			status,
		});

		const buyInCents = Math.round(buyIn * 100);
		for (const entry of entries) {
			const netCents = Math.round(entry.net * 100);
			const cashOutCents = buyInCents + netCents;
			if (cashOutCents < 0) continue;
			await upsertEntry(db, id, entry.player_id, buyInCents, cashOutCents);
		}

		if (status === 'pending' && group_id) {
			if (groupOwnerId) {
				await notifyGroupLeaderPending(db, id, name, groupOwnerId, platform?.env);
			}
			redirect(302, `/groups/${group_id}?submitted=pending`);
		}

		// Session is immediately approved — notify participants and create settlements
		await notifySessionApproved(db, id, name, platform?.env);
		redirect(302, `/sessions/${id}`);
	}
};
