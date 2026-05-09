/**
 * Auth helpers using Web Crypto API (PBKDF2) — works in Cloudflare Workers.
 */

/** Hash a password with PBKDF2. Returns "saltHex:hashHex". */
export async function hashPassword(password: string): Promise<string> {
	const salt = crypto.getRandomValues(new Uint8Array(16));
	const keyMaterial = await crypto.subtle.importKey(
		'raw',
		new TextEncoder().encode(password),
		'PBKDF2',
		false,
		['deriveBits']
	);
	const derived = await crypto.subtle.deriveBits(
		{ name: 'PBKDF2', salt, iterations: 100_000, hash: 'SHA-256' },
		keyMaterial,
		256
	);
	const saltHex = Array.from(salt).map(b => b.toString(16).padStart(2, '0')).join('');
	const hashHex = Array.from(new Uint8Array(derived)).map(b => b.toString(16).padStart(2, '0')).join('');
	return `${saltHex}:${hashHex}`;
}

/** Verify a password against a stored "saltHex:hashHex" string. */
export async function verifyPassword(password: string, stored: string): Promise<boolean> {
	const [saltHex, hashHex] = stored.split(':');
	if (!saltHex || !hashHex) return false;
	const salt = new Uint8Array(saltHex.match(/.{2}/g)!.map(b => parseInt(b, 16)));
	const keyMaterial = await crypto.subtle.importKey(
		'raw',
		new TextEncoder().encode(password),
		'PBKDF2',
		false,
		['deriveBits']
	);
	const derived = await crypto.subtle.deriveBits(
		{ name: 'PBKDF2', salt, iterations: 100_000, hash: 'SHA-256' },
		keyMaterial,
		256
	);
	const candidateHex = Array.from(new Uint8Array(derived)).map(b => b.toString(16).padStart(2, '0')).join('');
	return candidateHex === hashHex;
}

/** Generate a 32-byte random session token as lowercase hex. */
export function generateToken(): string {
	const bytes = crypto.getRandomValues(new Uint8Array(32));
	return Array.from(bytes).map(b => b.toString(16).padStart(2, '0')).join('');
}

/** Generate an 8-character uppercase alphanumeric invite code. */
export function generateInviteCode(): string {
	const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
	const bytes = crypto.getRandomValues(new Uint8Array(8));
	return Array.from(bytes).map(b => chars[b % chars.length]).join('');
}
