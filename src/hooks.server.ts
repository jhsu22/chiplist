import type { Handle } from '@sveltejs/kit';
import { getUserFromSession } from '$lib/db';

export const handle: Handle = async ({ event, resolve }) => {
	event.locals.user = null;

	const db = event.platform?.env?.DB;
	if (db) {
		const token = event.cookies.get('chiplist_session');
		if (token) {
			const user = await getUserFromSession(db, token);
			if (user) {
				event.locals.user = user;
			}
		}
	}

	return resolve(event);
};
