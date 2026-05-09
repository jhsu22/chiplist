import type { Actions, PageServerLoad } from './$types';
import { fail, redirect } from '@sveltejs/kit';
import { createUser, getUserByUsername, createAuthSession, createPlayer } from '$lib/db';
import { hashPassword, generateToken } from '$lib/auth';

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
		const display_name = String(data.get('display_name') ?? '').trim();
		const password = String(data.get('password') ?? '');
		const confirm = String(data.get('confirm_password') ?? '');

		if (!username || !password) return fail(400, { error: 'Username and password are required' });
		if (username.length < 3) return fail(400, { error: 'Username must be at least 3 characters' });
		if (!/^[a-zA-Z0-9_]+$/.test(username)) return fail(400, { error: 'Username can only contain letters, numbers, and underscores' });
		if (password !== confirm) return fail(400, { error: 'Passwords do not match' });
		if (password.length < 8) return fail(400, { error: 'Password must be at least 8 characters' });

		const existing = await getUserByUsername(db, username);
		if (existing) return fail(400, { error: 'That username is already taken' });

		const password_hash = await hashPassword(password);
		const playerName = display_name || username;
		const userId = await createUser(db, username, password_hash, playerName);

		// Auto-create and link a player profile
		const playerId = await createPlayer(db, playerName);
		await db.prepare('UPDATE players SET user_id = ? WHERE id = ?').bind(userId, playerId).run();

		const token = generateToken();
		const expires = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
			.toISOString().replace('T', ' ').slice(0, 19);
		await createAuthSession(db, token, userId, expires);

		const secure = request.url.startsWith('https://');
		cookies.set('chiplist_session', token, {
			httpOnly: true,
			sameSite: 'lax',
			path: '/',
			maxAge: 30 * 24 * 60 * 60,
			secure,
		});

		redirect(302, '/groups/new');
	}
};
