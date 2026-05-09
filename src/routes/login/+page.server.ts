import type { Actions, PageServerLoad } from './$types';
import { fail, redirect } from '@sveltejs/kit';
import { createAuthSession } from '$lib/db';
import { verifyPassword, generateToken } from '$lib/auth';

export const load: PageServerLoad = async ({ locals }) => {
	if (locals.user) redirect(302, '/');
	return {};
};

export const actions: Actions = {
	default: async ({ request, platform, cookies }) => {
		const db = platform?.env?.DB;
		if (!db) return fail(503, { error: 'Database unavailable' });

		const data = await request.formData();
		const username = String(data.get('username') ?? '').trim();
		const password = String(data.get('password') ?? '');

		if (!username || !password) return fail(400, { error: 'Username and password are required' });

		const userWithHash = await db
			.prepare('SELECT id, username, display_name, password_hash FROM users WHERE username = ?')
			.bind(username)
			.first<{ id: number; username: string; display_name: string; password_hash: string }>();

		if (!userWithHash) return fail(401, { error: 'Invalid username or password' });

		const valid = await verifyPassword(password, userWithHash.password_hash);
		if (!valid) return fail(401, { error: 'Invalid username or password' });

		const token = generateToken();
		const expires = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
			.toISOString().replace('T', ' ').slice(0, 19);
		await createAuthSession(db, token, userWithHash.id, expires);

		const secure = request.url.startsWith('https://');
		cookies.set('chiplist_session', token, {
			httpOnly: true,
			sameSite: 'lax',
			path: '/',
			maxAge: 30 * 24 * 60 * 60,
			secure,
		});

		redirect(302, '/');
	}
};
