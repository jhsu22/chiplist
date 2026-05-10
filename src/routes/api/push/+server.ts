import type { RequestHandler } from './$types';
import { json, error } from '@sveltejs/kit';
import { upsertPushSubscription, deletePushSubscription } from '$lib/db';

export const POST: RequestHandler = async ({ request, platform, locals }) => {
	if (!locals.user) error(401, 'Not logged in');
	const db = platform?.env?.DB;
	if (!db) error(503, 'Database unavailable');

	const { endpoint, keys } = await request.json();
	if (!endpoint || !keys?.p256dh || !keys?.auth) error(400, 'Invalid subscription');

	await upsertPushSubscription(db, locals.user.id, endpoint, keys.p256dh, keys.auth);
	return json({ ok: true });
};

export const DELETE: RequestHandler = async ({ request, platform, locals }) => {
	if (!locals.user) error(401, 'Not logged in');
	const db = platform?.env?.DB;
	if (!db) error(503, 'Database unavailable');

	const { endpoint } = await request.json();
	if (!endpoint) error(400, 'Missing endpoint');

	await deletePushSubscription(db, locals.user.id, endpoint);
	return json({ ok: true });
};
