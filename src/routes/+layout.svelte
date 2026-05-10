<script lang="ts">
	import '../app.css';
	import { page } from '$app/stores';
	import { onMount } from 'svelte';
	import { invalidateAll } from '$app/navigation';

	export let data: { vapidPublicKey?: string | null; [k: string]: unknown };

	$: path = $page.url.pathname;
	$: activeTab =
		path === '/' ? 'home' :
		path.startsWith('/sessions/new') ? 'new' :
		path.startsWith('/sessions') ? 'sessions' :
		path.startsWith('/groups') ? 'groups' :
		path.startsWith('/profile') || path.startsWith('/players') ? 'me' : 'home';

	// ── Pull-to-refresh ──────────────────────────────────────────────────────
	let screenInner: HTMLElement;
	let pullDelta = 0;
	let pulling = false;
	let refreshing = false;
	let touchY0 = 0;

	onMount(() => {
		function onTouchStart(e: TouchEvent) {
			if (screenInner.scrollTop === 0 && !refreshing) {
				touchY0 = e.touches[0].clientY;
				pulling = true;
			}
		}

		function onTouchMove(e: TouchEvent) {
			const delta = e.touches[0].clientY - touchY0;
			// Always block native top bounce — any downward pull at the top
			// goes through our custom PTR instead of the browser elastic.
			if (screenInner.scrollTop === 0 && delta > 0) {
				e.preventDefault();
			}
			if (!pulling) return;
			if (delta <= 0) { pulling = false; pullDelta = 0; return; }
			pullDelta = Math.min(delta * 0.45, 72);
		}

		async function onTouchEnd() {
			if (!pulling) return;
			const triggered = pullDelta > 52;
			pulling = false;
			if (triggered) {
				refreshing = true;
				pullDelta = 44;
				await invalidateAll();
				refreshing = false;
			}
			pullDelta = 0;
		}

		screenInner.addEventListener('touchstart', onTouchStart, { passive: true });
		screenInner.addEventListener('touchmove', onTouchMove, { passive: false });
		screenInner.addEventListener('touchend', onTouchEnd, { passive: true });
		return () => {
			screenInner.removeEventListener('touchstart', onTouchStart);
			screenInner.removeEventListener('touchmove', onTouchMove);
			screenInner.removeEventListener('touchend', onTouchEnd);
		};
	});

	// ── Push notification subscription ──────────────────────────────────────
	onMount(async () => {
		if (!data.vapidPublicKey) return;
		if (!('serviceWorker' in navigator) || !('PushManager' in window)) return;

		try {
			const reg = await navigator.serviceWorker.ready;
			const existing = await reg.pushManager.getSubscription();
			if (!existing) return; // only auto-subscribe if user has explicitly opted in
		} catch {}
	});

	export async function subscribeToPush(): Promise<boolean> {
		if (!data.vapidPublicKey) return false;
		try {
			const perm = await Notification.requestPermission();
			if (perm !== 'granted') return false;

			const reg = await navigator.serviceWorker.ready;
			const sub = await reg.pushManager.subscribe({
				userVisibleOnly: true,
				applicationServerKey: data.vapidPublicKey
			});
			const json = sub.toJSON() as { endpoint: string; keys: { p256dh: string; auth: string } };
			await fetch('/api/push', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify(json)
			});
			return true;
		} catch {
			return false;
		}
	}
</script>

<div class="shell">
	<div class="screen">
		<!-- Pull-to-refresh indicator (floats above content) -->
		{#if pullDelta > 6}
			<div class="ptr-wrap" style="opacity:{Math.min(pullDelta / 52, 1)}">
				<div class="ptr-spinner" class:spinning={refreshing}
					style="transform:rotate({refreshing ? 0 : (pullDelta / 72) * 270}deg)"></div>
			</div>
		{/if}

		<div class="screen-inner pop-scroll" bind:this={screenInner}>
			<slot />
		</div>
		<!-- Tab bar -->
		<nav class="tabbar">
			<a href="/" class="tab" class:active={activeTab === 'home'}>
				<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width={activeTab === 'home' ? 2.4 : 2} stroke-linecap="round" stroke-linejoin="round">
					<path d="M3 11l9-7 9 7v9a1 1 0 01-1 1h-5v-6h-6v6H4a1 1 0 01-1-1z"/>
				</svg>
				<span>Home</span>
			</a>

			<a href="/sessions" class="tab" class:active={activeTab === 'sessions'}>
				<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width={activeTab === 'sessions' ? 2.4 : 2} stroke-linecap="round" stroke-linejoin="round">
					<path d="M4 6h16M4 12h16M4 18h10"/>
				</svg>
				<span>Sessions</span>
			</a>

			<a href="/sessions/new" class="tab tab-new">
				<svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round">
					<path d="M12 5v14M5 12h14"/>
				</svg>
			</a>

			<a href="/groups" class="tab" class:active={activeTab === 'groups'}>
				<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width={activeTab === 'groups' ? 2.4 : 2} stroke-linecap="round" stroke-linejoin="round">
					<circle cx="9" cy="9" r="3.5"/>
					<circle cx="17" cy="10" r="2.5"/>
					<path d="M3 19c.8-3.5 3.2-5 6-5s5.2 1.5 6 5M15 19c.5-2 1.7-3 3-3s2.4 1 3 3"/>
				</svg>
				<span>Groups</span>
			</a>

			<a href="/profile" class="tab" class:active={activeTab === 'me'}>
				<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width={activeTab === 'me' ? 2.4 : 2} stroke-linecap="round" stroke-linejoin="round">
					<circle cx="12" cy="8" r="4"/>
					<path d="M4 21c1-4.5 4-7 8-7s7 2.5 8 7"/>
				</svg>
				<span>Me</span>
			</a>
		</nav>
	</div>
</div>

<style>
.shell {
	position: fixed;
	inset: 0;
	display: flex;
	justify-content: center;
	background: #ECEAE3;
	overflow: hidden;
}

.screen {
	position: relative;
	width: 100%;
	max-width: 430px;
	height: 100%;
	background: var(--bg);
	display: flex;
	flex-direction: column;
	overflow: hidden;
	padding-top: env(safe-area-inset-top);
}

.screen-inner {
	flex: 1;
	overflow-y: auto;
	-webkit-overflow-scrolling: touch;
	min-height: 0;
	padding-bottom: 16px;
}

.ptr-wrap {
	position: absolute;
	top: calc(env(safe-area-inset-top) + 8px);
	left: 50%;
	transform: translateX(-50%);
	z-index: 200;
	background: var(--card);
	border-radius: 999px;
	padding: 8px;
	box-shadow: 0 2px 10px rgba(0,0,0,0.12);
	pointer-events: none;
}

.ptr-spinner {
	width: 20px;
	height: 20px;
	border: 2.5px solid var(--rule);
	border-top-color: var(--ink);
	border-radius: 50%;
}

.ptr-spinner.spinning {
	animation: ptr-spin 0.7s linear infinite;
}

@keyframes ptr-spin { to { transform: rotate(360deg); } }

.tabbar {
	flex-shrink: 0;
	padding: 8px 8px max(28px, env(safe-area-inset-bottom));
	background: rgba(255, 246, 236, 0.92);
	backdrop-filter: blur(20px);
	-webkit-backdrop-filter: blur(20px);
	border-top: 1px solid var(--rule);
	display: flex;
	justify-content: space-around;
	align-items: center;
	z-index: 100;
}

.tab {
	flex: 1;
	display: flex;
	flex-direction: column;
	align-items: center;
	text-decoration: none;
	padding: 6px 0;
	color: var(--ink3);
	gap: 2px;
}

.tab span {
	font-size: 10px;
	font-weight: 800;
	letter-spacing: 0.3px;
}

.tab.active {
	color: var(--ink);
}

.tab-new {
	width: 56px;
	height: 56px;
	border-radius: 999px;
	background: var(--accent);
	color: white;
	display: flex;
	align-items: center;
	justify-content: center;
	flex: none;
	border: 2.5px solid var(--ink);
	box-shadow: 0 3px 0 var(--ink);
	margin-top: -22px;
	flex-direction: row;
}
</style>
