import type { D1Database } from '@cloudflare/workers-types';

declare global {
	namespace App {
		interface Locals {
			user: { id: number; username: string; display_name: string } | null;
		}
		interface Platform {
			env: {
				DB: D1Database;
				VAPID_PUBLIC_KEY?: string;
				VAPID_PRIVATE_KEY?: string;
				VAPID_SUBJECT?: string;
			};
		}
	}
}

export {};
