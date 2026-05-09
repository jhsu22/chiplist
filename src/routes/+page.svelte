<script lang="ts">
	import type { PageData } from './$types';
	import { formatProfit, playerColor, initials } from '$lib/utils';
	import { page } from '$app/stores';

	export let data: PageData;

	$: user = $page.data.user;
	$: top3 = data.leaderboard.slice(0, 3);
	$: rest = data.leaderboard.slice(3);

	// Group toggle — client-side, defaults to most-active group (index 0)
	let activeGroupIdx = 0;
	$: activeGroup = data.groups[activeGroupIdx] ?? null;

	// Status blurb based on recent results
	$: statusBlurb = (() => {
		if (!data.user_stats || data.user_stats.sessions_played === 0) return null;
		const p = data.user_stats.last_profit;
		if (p === null) return null;
		if (p > 0) return 'On a heater 🔥';
		if (p < 0) return 'Due for a comeback';
		return 'Break even last time';
	})();
</script>

<svelte:head>
	<title>chiplist</title>
</svelte:head>

<!-- Header -->
<div class="header">
	{#if user}
		<a href="/profile" class="avatar-sm" style="background:var(--accent); color:white; text-decoration:none">
			{initials(user.display_name || user.username)}
		</a>
	{:else}
		<a href="/login" class="avatar-sm login-btn" style="text-decoration:none">
			<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
				<circle cx="12" cy="8" r="4"/>
				<path d="M4 21c1-4.5 4-7 8-7s7 2.5 8 7"/>
			</svg>
		</a>
	{/if}
	<div class="logo"><span class="dot"></span>chiplist</div>
	<a href="/notifications" class="icon-btn" style="text-decoration:none; position:relative">
		<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
			<path d="M6 16V11a6 6 0 0112 0v5l1.5 2h-15z"/>
			<path d="M10 20a2 2 0 004 0"/>
		</svg>
		{#if ($page.data.unreadCount ?? 0) > 0}
			<span style="position:absolute;top:-4px;right:-4px;background:#e05555;color:white;font-size:9px;font-weight:800;line-height:1;padding:2px 4px;border-radius:999px;min-width:14px;text-align:center">{$page.data.unreadCount > 9 ? '9+' : $page.data.unreadCount}</span>
		{/if}
	</a>
</div>

<!-- ── LOGGED IN ── -->
{#if user && data.user_stats !== null}
	{#if data.user_stats.player}
		<!-- Personal bankroll hero -->
		<div class="section">
			<div class="hero-label">Hey {user.display_name?.split(' ')[0] || user.username}{statusBlurb ? ` · ${statusBlurb}` : ''}</div>
			<div class="hero-number {data.user_stats.net_profit >= 0 ? 'pos' : 'neg'}">
				{formatProfit(data.user_stats.net_profit)}
			</div>
			<div style="display:flex; gap:8px; margin-top:14px; flex-wrap:wrap">
				{#if data.user_stats.last_profit !== null}
					<div class="pill-{data.user_stats.last_profit >= 0 ? 'pos' : 'neg2'}">
						{data.user_stats.last_profit >= 0 ? '↑' : '↓'} {formatProfit(data.user_stats.last_profit)} last sess
					</div>
				{/if}
				<div class="pill-cobalt">{data.user_stats.sessions_played} sessions</div>
				<div class="pill-muted">{Math.round(data.user_stats.win_rate * 100)}% W</div>
			</div>
		</div>
	{:else}
		<!-- No player yet — prompt to set up -->
		<div class="section">
			<div class="hero-label">Hey {user.display_name?.split(' ')[0] || user.username}</div>
			<div class="hero-title">Set up your profile to track your bankroll</div>
			<div style="display:flex; gap:8px; margin-top:14px; flex-wrap:wrap">
				<a href="/profile" class="pill-accent">Set up profile →</a>
			</div>
		</div>
	{/if}

	{#if data.groups.length > 0}
		<!-- Group selector tabs -->
		<div class="section" style="padding-bottom:0">
			<div class="section-header" style="margin-bottom:10px">
				<div class="section-title">Group leaderboard</div>
				<a href="/groups" class="see-all">All groups →</a>
			</div>
			{#if data.groups.length > 1}
				<div class="pop-scroll" style="display:flex; gap:8px; overflow-x:auto; padding-bottom:4px; margin-bottom:14px">
					{#each data.groups as g, i}
						<button type="button" class="group-tab" class:active={activeGroupIdx === i}
							on:click={() => activeGroupIdx = i}>
							{g.name}
						</button>
					{/each}
				</div>
			{/if}
		</div>

		<!-- Group leaderboard -->
		{#if activeGroup}
			<div class="section" style="padding-top:0">
				{#if activeGroup.members.length === 0}
					<div style="font-size:13px; color:var(--ink3); text-align:center; padding:20px 0">
						No sessions logged in this group yet.
						<a href="/sessions/new" style="color:var(--accent); font-weight:800; text-decoration:none; display:block; margin-top:8px">Log a session →</a>
					</div>
				{:else}
					{@const grpTop3 = activeGroup.members.slice(0, 3)}
					{@const grpRest = activeGroup.members.slice(3)}
					{#if grpTop3.length >= 2}
						<div class="podium">
							{#each [grpTop3[1], grpTop3[0], grpTop3[2]].filter(Boolean) as m, i}
								{@const rank = i === 1 ? 1 : i === 0 ? 2 : 3}
								{@const heights = { 1: 130, 2: 100, 3: 82 }}
								{@const bgs = { 1: 'var(--butter)', 2: 'var(--coral-soft)', 3: 'var(--cobalt-soft)' }}
								<a href="/players/{m.player_id}" class="podium-col">
									<div class="podium-avatar" style="background:{playerColor(m.player_id)}">{initials(m.player_name)}</div>
									<div class="podium-name">{m.player_name.split(' ')[0]}</div>
									<div class="podium-bar" style="height:{heights[rank]}px; background:{bgs[rank]}">
										<div class="podium-bar-val">{formatProfit(m.net_profit)}</div>
										<div class="podium-bar-rank">{rank}</div>
									</div>
								</a>
							{/each}
						</div>
						{#if grpRest.length > 0}
							<div style="margin-top:8px">
								{#each grpRest as m, i}
									<a href="/players/{m.player_id}" class="row-card">
										<div class="row-rank">{i + 4}</div>
										<div class="row-avatar" style="background:{playerColor(m.player_id)}">{initials(m.player_name)}</div>
										<div class="row-info">
											<div class="row-name">{m.player_name}</div>
											<div class="row-sub">{m.sessions} sess · {Math.round(m.win_rate * 100)}% win</div>
										</div>
										<div class="row-profit pop-mono" style="color:{m.net_profit >= 0 ? 'var(--pos)' : 'var(--neg)'}">
											{formatProfit(m.net_profit)}
										</div>
									</a>
								{/each}
							</div>
						{/if}
					{:else}
						{#each activeGroup.members as m, i}
							<a href="/players/{m.player_id}" class="row-card">
								<div class="row-rank" style="color:{i < 3 ? 'var(--accent)' : 'var(--ink3)'}">{i + 1}</div>
								<div class="row-avatar" style="background:{playerColor(m.player_id)}">{initials(m.player_name)}</div>
								<div class="row-info">
									<div class="row-name">{m.player_name}</div>
									<div class="row-sub">{m.sessions} sess · {Math.round(m.win_rate * 100)}% win</div>
								</div>
								<div class="row-profit pop-mono" style="color:{m.net_profit >= 0 ? 'var(--pos)' : 'var(--neg)'}">
									{formatProfit(m.net_profit)}
								</div>
							</a>
						{/each}
					{/if}
				{/if}
			</div>
		{/if}

	{:else}
		<!-- No groups yet -->
		<div class="section">
			<div style="background:var(--bg2); border-radius:18px; padding:20px; border:1.5px dashed var(--ink3); text-align:center">
				<div style="font-size:15px; font-weight:800; color:var(--ink); margin-bottom:6px">No group yet</div>
				<div style="font-size:13px; color:var(--ink2); margin-bottom:14px">Create a group to track sessions with your crew and see a leaderboard.</div>
				<a href="/groups/new" class="pill-accent">Create a group →</a>
			</div>
		</div>
	{/if}

<!-- ── NOT LOGGED IN ── -->
{:else if !user}
	<div class="section">
		{#if data.total_sessions === 0}
			<div class="hero-label">Get started</div>
			<div class="hero-title">Track your poker bankroll</div>
			<div style="display:flex; gap:8px; margin-top:14px; flex-wrap:wrap">
				<a href="/signup" class="pill-accent">Sign up free</a>
				<a href="/login" class="pill-muted">Log in</a>
			</div>
		{:else}
			<div class="hero-label">Global leaderboard</div>
			<div class="hero-number {data.leaderboard[0]?.net_profit >= 0 ? 'pos' : 'neg'}">
				{data.leaderboard[0] ? formatProfit(data.leaderboard[0].net_profit) : '$0'}
			</div>
			<div style="display:flex; gap:8px; margin-top:14px; flex-wrap:wrap">
				<div class="pill-pos">↑ {data.leaderboard[0]?.name.split(' ')[0] ?? '—'} leads</div>
				<div class="pill-cobalt">{data.total_sessions} sessions</div>
				<div class="pill-muted">{data.total_players} players</div>
			</div>
		{/if}
	</div>

	<!-- Podium (not logged in) -->
	{#if top3.length >= 2}
	<div class="section">
		<div class="section-header">
			<div class="section-title">Leaderboard</div>
			<a href="/login" class="see-all">Sign in to track →</a>
		</div>
		<div class="podium">
			{#each [top3[1], top3[0], top3[2]].filter(Boolean) as p, i}
				{@const rank = i === 1 ? 1 : i === 0 ? 2 : 3}
				{@const heights = { 1: 130, 2: 100, 3: 82 }}
				{@const bgs = { 1: 'var(--butter)', 2: 'var(--coral-soft)', 3: 'var(--cobalt-soft)' }}
				<a href="/players/{p.id}" class="podium-col">
					<div class="podium-avatar" style="background:{playerColor(p.id, p.color)}">{initials(p.name)}</div>
					<div class="podium-name">{p.name.split(' ')[0]}</div>
					<div class="podium-bar" style="height:{heights[rank]}px; background:{bgs[rank]}">
						<div class="podium-bar-val">{formatProfit(p.net_profit)}</div>
						<div class="podium-bar-rank">{rank}</div>
					</div>
				</a>
			{/each}
		</div>
	</div>
	{/if}

	{#if rest.length > 0}
	<div class="section" style="padding-top:0">
		<div class="podium-rule">
			<div class="podium-rule-line"></div>
			<span class="podium-rule-label">More players</span>
			<div class="podium-rule-line"></div>
		</div>
		{#each rest as p, i}
			<a href="/players/{p.id}" class="row-card">
				<div class="row-rank">{i + 4}</div>
				<div class="row-avatar" style="background:{playerColor(p.id, p.color)}">{initials(p.name)}</div>
				<div class="row-info">
					<div class="row-name">{p.name}</div>
					<div class="row-sub">{Math.round(p.win_rate * 100)}% win · {p.sessions} sess</div>
				</div>
				<div class="row-profit pop-mono {p.net_profit >= 0 ? 'pos' : 'neg'}">{formatProfit(p.net_profit)}</div>
			</a>
		{/each}
	</div>
	{/if}
{/if}

<!-- Recent sessions (always shown) -->
<div class="section">
	<div class="section-header">
		<div class="section-title">Recent nights</div>
		<a href="/sessions" class="see-all">See all →</a>
	</div>
	{#if data.recent_sessions.length === 0}
		<div class="empty">No sessions yet. <a href="/sessions/new" class="see-all">Log one →</a></div>
	{:else}
		{#each data.recent_sessions as s}
			<a href="/sessions/{s.id}" class="session-card">
				<div class="session-card-head">
					<div class="session-loc">{s.location || s.name}</div>
					<div class="session-date">{s.date}</div>
				</div>
				<div class="chips">
					{#if s.blinds}<span class="chip">{s.blinds}</span>{/if}
					{#if s.hours}<span class="chip">{s.hours}h</span>{/if}
					{#if s.top_winner?.name}
						<span class="chip chip-pos">👑 {s.top_winner.name.split(' ')[0]} {formatProfit(s.top_winner.net)}</span>
					{/if}
				</div>
			</a>
		{/each}
	{/if}
</div>

<style>
.header { padding: 20px 20px 0; display:flex; justify-content:space-between; align-items:center; }
.avatar-sm { width:38px; height:38px; border-radius:999px; display:flex; align-items:center; justify-content:center; font-size:12px; font-weight:800; border:2px solid var(--ink); }
.login-btn { color:var(--ink2); background:var(--card); }
.logo { font-size:20px; font-weight:800; letter-spacing:-0.4px; display:flex; align-items:center; gap:6px; color:var(--ink); }
.dot { width:8px; height:8px; border-radius:99px; background:var(--accent); display:inline-block; }
.icon-btn { width:38px; height:38px; border-radius:999px; background:var(--card); border:1.5px solid var(--rule); display:flex; align-items:center; justify-content:center; color:var(--ink); }

.section { padding:24px 20px 0; }
.section-header { display:flex; justify-content:space-between; align-items:baseline; margin-bottom:14px; }
.section-title { font-size:12px; font-weight:800; letter-spacing:1.4px; text-transform:uppercase; color:var(--ink2); }
.see-all { font-size:12px; color:var(--accent); font-weight:800; text-decoration:none; }
.empty { font-size:13px; color:var(--ink3); }

.hero-label { font-size:13px; color:var(--ink2); }
.hero-title { font-size:18px; font-weight:700; color:var(--ink); margin-top:2px; }
.hero-number { font-size:60px; line-height:0.9; font-weight:800; letter-spacing:-0.04em; margin-top:14px; }
.pos { color:var(--pos); }
.neg { color:var(--neg); }

.pill-accent { background:var(--accent); color:white; padding:6px 14px; border-radius:999px; font-size:12px; font-weight:800; text-decoration:none; }
.pill-pos { background:var(--pos-bg); color:var(--pos); padding:6px 12px; border-radius:999px; font-size:12px; font-weight:800; }
.pill-neg2 { background:var(--neg-bg); color:var(--neg); padding:6px 12px; border-radius:999px; font-size:12px; font-weight:800; }
.pill-cobalt { background:var(--cobalt-soft); color:var(--cobalt); padding:6px 12px; border-radius:999px; font-size:12px; font-weight:800; }
.pill-muted { background:var(--bg2); color:var(--ink); padding:6px 12px; border-radius:999px; font-size:12px; font-weight:800; text-decoration:none; }

.group-tab { padding:8px 14px; border-radius:999px; font-size:12px; font-weight:800; cursor:pointer; border:1.5px solid var(--rule); background:var(--card); color:var(--ink2); font-family:inherit; white-space:nowrap; }
.group-tab.active { background:var(--ink); color:var(--bg); border-color:var(--ink); }

.podium { display:flex; align-items:flex-end; gap:10px; justify-content:space-between; }
.podium-col { flex:1; display:flex; flex-direction:column; align-items:center; cursor:pointer; text-decoration:none; color:inherit; }
.podium-avatar { width:50px; height:50px; border-radius:999px; display:flex; align-items:center; justify-content:center; font-size:16px; font-weight:800; color:#3A2E1A; border:2.5px solid var(--ink); margin-bottom:6px; }
.podium-name { font-size:12px; font-weight:800; margin-bottom:6px; color:var(--ink); }
.podium-bar { width:100%; border-radius:14px 14px 0 0; border:2px solid var(--ink); border-bottom:none; display:flex; flex-direction:column; align-items:center; justify-content:center; padding:10px 4px; }
.podium-bar-val { font-size:12px; font-weight:800; color:var(--ink); font-feature-settings:"tnum" 1; line-height:1; }
.podium-bar-rank { font-size:22px; font-weight:800; letter-spacing:-0.04em; color:var(--ink); margin-top:4px; }

.podium-rule { display:flex; align-items:center; gap:10px; margin:20px 0 14px; }
.podium-rule-line { flex:1; height:1px; background:var(--rule); }
.podium-rule-label { font-size:10px; font-weight:800; letter-spacing:1.4px; text-transform:uppercase; color:var(--ink3); white-space:nowrap; }

.row-card { display:flex; align-items:center; padding:12px 16px; background:var(--card); border-radius:16px; margin-bottom:8px; border:1.5px solid var(--rule); text-decoration:none; color:inherit; }
.row-rank { width:22px; font-size:13px; font-weight:800; color:var(--ink3); }
.row-avatar { width:36px; height:36px; border-radius:999px; margin-right:12px; display:flex; align-items:center; justify-content:center; font-size:12px; font-weight:800; color:#3A2E1A; }
.row-info { flex:1; }
.row-name { font-size:14px; font-weight:800; color:var(--ink); }
.row-sub { font-size:11px; color:var(--ink2); margin-top:1px; }
.row-profit { font-size:16px; font-weight:800; }

.session-card { background:var(--card); border-radius:18px; padding:13px 16px; margin-bottom:10px; border:1.5px solid var(--rule); text-decoration:none; color:inherit; display:block; }
.session-card-head { display:flex; justify-content:space-between; align-items:baseline; }
.session-loc { font-size:15px; font-weight:800; color:var(--ink); }
.session-date { font-size:11px; color:var(--ink2); font-weight:700; }
.chips { display:flex; gap:6px; margin-top:8px; flex-wrap:wrap; }
.chip { background:var(--bg); padding:4px 10px; border-radius:999px; font-size:11px; font-weight:700; color:var(--ink2); }
.chip-pos { background:var(--pos-bg); color:var(--pos); font-weight:800; }
</style>
