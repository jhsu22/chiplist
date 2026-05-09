import type { PageServerLoad } from './$types';
import { getUserGroups, getGroupMembers } from '$lib/db';

export const load: PageServerLoad = async ({ locals, platform }) => {
	if (!locals.user) return { user: null, groups: [] };

	const db = platform?.env?.DB;
	if (!db) return { user: locals.user, groups: [] };

	const groups = await getUserGroups(db, locals.user.id);

	// Get member count for each group
	const groupsWithCount = await Promise.all(
		groups.map(async (g) => {
			const members = await getGroupMembers(db, g.id);
			return { ...g, member_count: members.length };
		})
	);

	return { user: locals.user, groups: groupsWithCount };
};
