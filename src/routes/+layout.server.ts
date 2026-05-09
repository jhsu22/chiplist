import type { LayoutServerLoad } from './$types';
import { getUnreadNotificationCount } from '$lib/db';

export const load: LayoutServerLoad = async ({ locals, platform }) => {
	let unreadCount = 0;
	if (locals.user && platform?.env?.DB) {
		unreadCount = await getUnreadNotificationCount(platform.env.DB, locals.user.id);
	}
	return { user: locals.user, unreadCount };
};
