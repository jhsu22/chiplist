import type { RequestHandler } from './$types';
import { redirect } from '@sveltejs/kit';
import { deleteAuthSession } from '$lib/db';

export const POST: RequestHandler = async ({ cookies, platform }) => {
	const token = cookies.get('chiplist_session');
	if (token) {
		const db = platform?.env?.DB;
		if (db) {
			await deleteAuthSession(db, token);
		}
		cookies.delete('chiplist_session', { path: '/' });
	}
	redirect(302, '/login');
};
