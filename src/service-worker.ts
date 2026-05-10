/// <reference lib="webworker" />
declare let self: ServiceWorkerGlobalScope;

self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (e) => e.waitUntil(self.clients.claim()));

self.addEventListener('push', (e) => {
	let data: { title: string; body: string; url?: string } = {
		title: 'chiplist',
		body: 'You have a new notification'
	};
	try {
		data = e.data?.json() ?? data;
	} catch {}

	e.waitUntil(
		self.registration.showNotification(data.title, {
			body: data.body,
			icon: '/icon-180.png',
			badge: '/icon-180.png',
			tag: 'chiplist',
			renotify: true,
			data: { url: data.url ?? '/notifications' }
		})
	);
});

self.addEventListener('notificationclick', (e) => {
	e.notification.close();
	const target = e.notification.data?.url ?? '/notifications';
	e.waitUntil(
		self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clients) => {
			const existing = clients.find((c) => c.url.includes(self.location.origin));
			if (existing) {
				existing.focus();
				existing.navigate(target);
			} else {
				self.clients.openWindow(target);
			}
		})
	);
});
