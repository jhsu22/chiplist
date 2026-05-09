<script lang="ts">
	import '../app.css';
	import { page } from '$app/stores';

	$: path = $page.url.pathname;
	$: activeTab =
		path === '/' ? 'home' :
		path.startsWith('/sessions/new') ? 'new' :
		path.startsWith('/sessions') ? 'sessions' :
		path.startsWith('/groups') ? 'groups' :
		path.startsWith('/profile') || path.startsWith('/players') ? 'me' : 'home';
	$: user = $page.data.user;
</script>

<div class="shell">
	<div class="screen">
		<div class="screen-inner pop-scroll">
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

			<!-- Me tab -->
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
	min-height: 100vh;
	display: flex;
	align-items: center;
	justify-content: center;
	padding: 0;
	background: #ECEAE3;
}

.screen {
	position: relative;
	width: 100%;
	max-width: 430px;
	min-height: 100vh;
	background: var(--bg);
	display: flex;
	flex-direction: column;
	overflow: hidden;
}

.screen-inner {
	flex: 1;
	overflow-y: auto;
	-webkit-overflow-scrolling: touch;
	padding-bottom: 100px;
}

.tabbar {
	position: sticky;
	bottom: 0;
	left: 0;
	right: 0;
	padding: 8px 8px 28px;
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
