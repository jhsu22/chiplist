// Web Push (RFC 8291 aes128gcm) — Web Crypto only, no Node.js required.

function b64decode(s: string): ArrayBuffer {
	const padded = s.replace(/-/g, '+').replace(/_/g, '/');
	const bin = atob(padded.padEnd(padded.length + ((4 - (padded.length % 4)) % 4), '='));
	const buf = new Uint8Array(bin.length);
	for (let i = 0; i < bin.length; i++) buf[i] = bin.charCodeAt(i);
	return buf.buffer;
}

function b64encode(buf: ArrayBuffer): string {
	const bytes = new Uint8Array(buf);
	let bin = '';
	for (const b of bytes) bin += String.fromCharCode(b);
	return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
}

function concat(...arrays: ArrayBuffer[]): ArrayBuffer {
	const total = arrays.reduce((n, a) => n + a.byteLength, 0);
	const out = new Uint8Array(total);
	let off = 0;
	for (const a of arrays) { out.set(new Uint8Array(a), off); off += a.byteLength; }
	return out.buffer;
}

function str(s: string): ArrayBuffer {
	return new TextEncoder().encode(s).buffer;
}

// PKCS#8 DER prefix for a raw 32-byte P-256 ECDSA private key
const PKCS8_P256_PREFIX = Uint8Array.from([
	0x30, 0x41, 0x02, 0x01, 0x00, 0x30, 0x13, 0x06,
	0x07, 0x2a, 0x86, 0x48, 0xce, 0x3d, 0x02, 0x01,
	0x06, 0x08, 0x2a, 0x86, 0x48, 0xce, 0x3d, 0x03,
	0x01, 0x07, 0x04, 0x27, 0x30, 0x25, 0x02, 0x01,
	0x01, 0x04, 0x20,
]).buffer;

async function importEcdsaPrivateKey(rawBase64url: string): Promise<CryptoKey> {
	return crypto.subtle.importKey(
		'pkcs8',
		concat(PKCS8_P256_PREFIX, b64decode(rawBase64url)),
		{ name: 'ECDSA', namedCurve: 'P-256' },
		false,
		['sign']
	);
}

async function hkdf(salt: ArrayBuffer, ikm: ArrayBuffer, info: ArrayBuffer, len: number): Promise<ArrayBuffer> {
	const key = await crypto.subtle.importKey('raw', ikm, { name: 'HKDF' }, false, ['deriveBits']);
	return crypto.subtle.deriveBits({ name: 'HKDF', hash: 'SHA-256', salt, info }, key, len * 8);
}

async function encryptPayload(payload: string, p256dh: string, authB64: string): Promise<ArrayBuffer> {
	const authSecret = b64decode(authB64);
	const salt = crypto.getRandomValues(new Uint8Array(16)).buffer;

	const receiverPub = b64decode(p256dh);
	const receiverKey = await crypto.subtle.importKey(
		'raw', receiverPub, { name: 'ECDH', namedCurve: 'P-256' }, true, []
	);

	const senderPair = await crypto.subtle.generateKey({ name: 'ECDH', namedCurve: 'P-256' }, true, ['deriveBits']);
	const senderPub = await crypto.subtle.exportKey('raw', senderPair.publicKey);

	const sharedSecret = await crypto.subtle.deriveBits(
		{ name: 'ECDH', public: receiverKey },
		senderPair.privateKey,
		256
	);

	// PRK = HKDF(salt=authSecret, ikm=sharedSecret, info="WebPush: info\x00" || receiverPub || senderPub)
	const prk = await hkdf(
		authSecret,
		sharedSecret,
		concat(str('WebPush: info\x00'), receiverPub, senderPub),
		32
	);

	const cek = await hkdf(salt, prk, str('Content-Encoding: aes128gcm\x00\x01'), 16);
	const nonce = await hkdf(salt, prk, str('Content-Encoding: nonce\x00\x01'), 12);

	const cekKey = await crypto.subtle.importKey('raw', cek, 'AES-GCM', false, ['encrypt']);

	// Plaintext = payload bytes + 0x02 (last-record delimiter)
	const plaintextBytes = new TextEncoder().encode(payload);
	const padded = new Uint8Array(plaintextBytes.length + 1);
	padded.set(plaintextBytes);
	padded[plaintextBytes.length] = 2;

	const ciphertext = await crypto.subtle.encrypt({ name: 'AES-GCM', iv: nonce }, cekKey, padded.buffer);

	// aes128gcm header: salt(16) || rs(4 BE uint32=4096) || keyid_len(1) || sender_pub(65)
	const rs = new Uint8Array(4);
	new DataView(rs.buffer).setUint32(0, 4096, false);
	const senderPubLen = new Uint8Array([new Uint8Array(senderPub).length]);

	return concat(salt, rs.buffer, senderPubLen.buffer, senderPub, ciphertext);
}

export async function sendWebPush(
	sub: { endpoint: string; p256dh: string; auth: string },
	payload: Record<string, unknown>,
	vapidPublicKey: string,
	vapidPrivateKey: string,
	vapidSubject: string
): Promise<void> {
	const origin = new URL(sub.endpoint).origin;

	const privateKey = await importEcdsaPrivateKey(vapidPrivateKey);
	const header = b64encode(str(JSON.stringify({ typ: 'JWT', alg: 'ES256' })));
	const claims = b64encode(str(JSON.stringify({ aud: origin, exp: Math.floor(Date.now() / 1000) + 43200, sub: vapidSubject })));
	const sigInput = `${header}.${claims}`;
	const sig = await crypto.subtle.sign(
		{ name: 'ECDSA', hash: 'SHA-256' },
		privateKey,
		new TextEncoder().encode(sigInput).buffer
	);
	const jwt = `${sigInput}.${b64encode(sig)}`;

	const body = await encryptPayload(JSON.stringify(payload), sub.p256dh, sub.auth);

	await fetch(sub.endpoint, {
		method: 'POST',
		headers: {
			Authorization: `vapid t=${jwt},k=${vapidPublicKey}`,
			'Content-Type': 'application/octet-stream',
			'Content-Encoding': 'aes128gcm',
			TTL: '86400'
		},
		body
	});
}
