import type { Actions, PageServerLoad } from './$types';
import { error, fail, redirect } from '@sveltejs/kit';

import { getPlayer, updatePlayer } from '$lib/db';

export const load: PageServerLoad = async ({ params, platform, locals }) => {
	if (!locals.user) redirect(302, '/login');
	const db = platform?.env?.DB;
	if (!db) error(503, 'Database unavailable');

	const id = Number(params.id);
	const player = await getPlayer(db, id);
	if (!player) error(404, 'Player not found');

	return { player };
};

export const actions: Actions = {
	default: async ({ request, params, platform }) => {
		const db = platform?.env?.DB;
		if (!db) return fail(503, { error: 'Database unavailable' });

		const id = Number(params.id);
		const data = await request.formData();
		const name = String(data.get('name') ?? '').trim();
		const color = String(data.get('color') ?? '').trim();
		const bio = String(data.get('bio') ?? '').trim();

		if (!name) return fail(400, { error: 'Name is required' });

		await updatePlayer(db, id, { name, color, bio });

		redirect(302, `/players/${id}`);
	}
};
