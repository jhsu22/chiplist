<script lang="ts">
	import type { PageData, ActionData } from './$types';
	import { enhance } from '$app/forms';
	import { page } from '$app/stores';
	import { formatProfit, initials, playerColor } from '$lib/utils';

	export let data: PageData;
	export let form: ActionData;

	let copied = false;
	function copyCode() {
		navigator.clipboard.writeText(data.group.invite_code).then(() => {
			copied = true;
			setTimeout(() => { copied = false; }, 2000);
		});
	}

	let showAddMember = false;
	let newMemberName = '';

	$: submittedPending = $page.url.searchParams.get('submitted') === 'pending';

	// Podium helpers
	$: top3 = data.members.slice(0, 3);
	$: rest = data.members.slice(3);
	const podiumOrder = (arr: typeof top3) => [arr[1], arr[0], arr[2]].filter(Boolean);
	const heights: Record<number, number> = { 1: 130, 2: 100, 3: 82 };
	const podiumBgs: Record<number, string> = { 1: 'var(--butter)', 2: 'var(--coral-soft)', 3: 'var(--cobalt-soft)' };
</script>

<svelte:head>
	<title>chiplist · {data.group.name}</title>
</svelte:head>

<!-- Header -->
<div style="padding:20px 20px 0; display:flex; justify-content:space-between; align-items:center">
	<a href="/groups" style="display:inline-flex; align-items:center; justify-content:center; width:36px; height:36px; border-radius:999px; background:var(--card); border:1.5px solid var(--ink); color:var(--ink); text-decoration:none">
		<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M15 6l-6 6 6 6"/></svg>
	</a>
	<div style="font-size:14px; font-weight:800; color:var(--ink)">Group</div>
	<div style="width:36px"></div>
</div>

<!-- Hero card -->
<div style="margin:20px 20px 0; border-radius:24px; padding:20px; background:var(--cobalt-soft); border:2.5px solid var(--ink)">
	<div class="pop-display" style="font-size:26px; color:var(--ink)">{data.group.name}</div>
	{#if data.group.description}
		<div style="font-size:13px; color:var(--ink2); margin-top:4px">{data.group.description}</div>
	{/if}
	{#if data.isLeader}
		<div style="margin-top:6px; font-size:11px; font-weight:800; color:var(--cobalt); letter-spacing:0.8px; text-transform:uppercase">Leader</div>
	{/if}
	<div style="margin-top:14px; display:flex; align-items:center; gap:8px">
		<div style="font-size:11px; font-weight:800; letter-spacing:1.2px; text-transform:uppercase; color:var(--ink2)">Invite</div>
		<button type="button" on:click={copyCode}
			style="display:flex; align-items:center; gap:6px; background:{copied ? 'var(--pos-bg)' : 'var(--card)'}; border:1.5px solid {copied ? 'var(--pos)' : 'var(--ink)'}; border-radius:10px; padding:5px 12px; cursor:pointer; font-family:inherit">
			<span style="font-size:14px; font-weight:800; font-family:monospace; color:{copied ? 'var(--pos)' : 'var(--ink)'}">{data.group.invite_code}</span>
			{#if copied}
				<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="var(--pos)" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12l5 5 9-11"/></svg>
			{:else}
				<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="var(--ink3)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1"/></svg>
			{/if}
		</button>
	</div>
</div>

<!-- Pending approval notice for submitters -->
{#if submittedPending}
	<div style="margin:16px 20px 0; padding:12px 14px; background:var(--butter); border:1.5px solid var(--ink); border-radius:14px; font-size:13px; font-weight:700; color:var(--ink)">
		Session submitted — waiting for leader approval before it counts toward bankrolls.
	</div>
{/if}

<!-- Pending sessions queue (leader only) -->
{#if data.isLeader && data.pendingSessions.length > 0}
	<div style="padding:20px 20px 0">
		<div style="font-size:12px; font-weight:800; letter-spacing:1.4px; text-transform:uppercase; color:var(--butter); margin-bottom:10px; display:flex; align-items:center; gap:6px">
			<div style="width:8px; height:8px; border-radius:99px; background:var(--accent); flex-shrink:0"></div>
			Awaiting approval · {data.pendingSessions.length}
		</div>
		{#each data.pendingSessions as s}
			<div style="background:var(--card); border:2px solid var(--butter); border-radius:16px; padding:13px 14px; margin-bottom:8px">
				<div style="display:flex; justify-content:space-between; align-items:baseline; margin-bottom:10px">
					<div style="font-size:14px; font-weight:800; color:var(--ink)">{s.location || s.name}</div>
					<div style="font-size:11px; color:var(--ink2); font-weight:700">{s.date}</div>
				</div>
				<div style="display:flex; gap:8px">
					<form method="POST" action="?/approve_session" use:enhance>
						<input type="hidden" name="session_id" value={s.id} />
						<button type="submit" style="padding:8px 16px; background:var(--pos); color:white; border-radius:999px; border:none; font-size:12px; font-weight:800; cursor:pointer; font-family:inherit">
							Approve ✓
						</button>
					</form>
					<form method="POST" action="?/reject_session" use:enhance>
						<input type="hidden" name="session_id" value={s.id} />
						<button type="submit" style="padding:8px 16px; background:var(--bg2); color:var(--ink2); border-radius:999px; border:none; font-size:12px; font-weight:800; cursor:pointer; font-family:inherit">
							Reject
						</button>
					</form>
					<a href="/sessions/{s.id}" style="padding:8px 14px; background:var(--bg2); color:var(--ink2); border-radius:999px; font-size:12px; font-weight:800; text-decoration:none; display:flex; align-items:center">
						View
					</a>
				</div>
			</div>
		{/each}
	</div>
{/if}

<!-- Leaderboard + member management -->
<div style="padding:20px 20px 0">
	<div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:12px">
		<div style="font-size:12px; font-weight:800; letter-spacing:1.4px; text-transform:uppercase; color:var(--ink2)">
			Members · {data.members.length}
		</div>
		<button type="button" on:click={() => showAddMember = !showAddMember}
			style="display:flex; align-items:center; gap:5px; padding:6px 12px; border-radius:999px; background:{showAddMember ? 'var(--ink)' : 'var(--bg2)'}; color:{showAddMember ? 'var(--bg)' : 'var(--ink2)'}; border:none; font-size:12px; font-weight:800; cursor:pointer; font-family:inherit">
			<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="M12 5v14M5 12h14"/></svg>
			Add player
		</button>
	</div>

	{#if showAddMember}
		<form method="POST" action="?/add_member" use:enhance={() => async ({ update }) => { await update(); newMemberName = ''; showAddMember = false; }}
			style="display:flex; gap:8px; margin-bottom:12px">
			{#if form?.add_error}
				<div style="font-size:12px; color:var(--neg); font-weight:700; width:100%">{form.add_error}</div>
			{/if}
			<input type="text" name="player_name" bind:value={newMemberName}
				placeholder="Player name"
				required
				style="flex:1; padding:11px 13px; border-radius:12px; border:1.5px solid var(--rule); background:var(--card); font-family:inherit; font-size:14px; font-weight:700; color:var(--ink); outline:none"/>
			<button type="submit"
				style="padding:11px 16px; background:var(--ink); color:var(--bg); border-radius:12px; border:none; font-size:13px; font-weight:800; cursor:pointer; font-family:inherit; white-space:nowrap">
				Add
			</button>
		</form>
	{/if}

	{#if form?.add_success}
		<div style="margin-bottom:10px; padding:10px 12px; background:var(--pos-bg); border:1.5px solid var(--pos); border-radius:10px; font-size:13px; font-weight:700; color:var(--pos)">Player added!</div>
	{/if}

	{#if data.members.length === 0}
		<div style="font-size:13px; color:var(--ink3); text-align:center; padding:20px 0">
			No members yet. Add players above to get started.
		</div>
	{:else if top3.length >= 2}
		<!-- Podium for top 3 -->
		<div style="display:flex; align-items:flex-end; gap:10px; justify-content:space-between; margin-bottom:0">
			{#each podiumOrder(top3) as m, i}
				{@const rank = i === 1 ? 1 : i === 0 ? 2 : 3}
				<a href="/players/{m.player_id}" style="flex:1; display:flex; flex-direction:column; align-items:center; text-decoration:none; color:inherit">
					<div style="width:50px; height:50px; border-radius:999px; display:flex; align-items:center; justify-content:center; font-size:16px; font-weight:800; color:#3A2E1A; border:2.5px solid var(--ink); margin-bottom:6px; background:{playerColor(m.player_id)}">{initials(m.player_name)}</div>
					<div style="font-size:12px; font-weight:800; margin-bottom:6px; color:var(--ink); text-align:center">{m.player_name.split(' ')[0]}</div>
					<div style="width:100%; border-radius:14px 14px 0 0; border:2px solid var(--ink); border-bottom:none; display:flex; flex-direction:column; align-items:center; justify-content:center; padding:10px 4px; background:{podiumBgs[rank]}; height:{heights[rank]}px">
						<div style="font-size:12px; font-weight:800; color:var(--ink); font-feature-settings:'tnum' 1; line-height:1">{formatProfit(m.net_profit)}</div>
						<div style="font-size:22px; font-weight:800; letter-spacing:-0.04em; color:var(--ink); margin-top:4px">{rank}</div>
					</div>
				</a>
			{/each}
		</div>

		{#if rest.length > 0}
			<div style="margin-top:8px; background:var(--card); border:1.5px solid var(--rule); border-radius:18px; overflow:hidden">
				{#each rest as m, i}
					{@const isLast = i === rest.length - 1}
					<a href="/players/{m.player_id}" style="display:flex; align-items:center; padding:12px 14px; border-bottom:{isLast ? 'none' : '1px solid var(--rule)'}; text-decoration:none; color:inherit">
						<div style="width:22px; font-size:13px; font-weight:800; color:var(--ink3)">#{i + 4}</div>
						<div style="width:36px; height:36px; border-radius:999px; background:{playerColor(m.player_id)}; display:flex; align-items:center; justify-content:center; font-size:12px; font-weight:800; color:#3A2E1A; margin-right:10px; flex-shrink:0">{initials(m.player_name)}</div>
						<div style="flex:1">
							<div style="font-size:14px; font-weight:800; color:var(--ink)">{m.player_name}</div>
							<div style="font-size:11px; color:var(--ink2); margin-top:1px">{m.sessions} sess · {Math.round(m.win_rate * 100)}% win</div>
						</div>
						<div style="font-size:15px; font-weight:800; font-feature-settings:'tnum' 1; color:{m.net_profit >= 0 ? 'var(--pos)' : 'var(--neg)'}">
							{formatProfit(m.net_profit)}
						</div>
					</a>
				{/each}
			</div>
		{/if}
	{:else}
		<!-- Fewer than 2 members: plain list -->
		<div style="background:var(--card); border:1.5px solid var(--rule); border-radius:18px; overflow:hidden">
			{#each data.members as m, i}
				{@const isLast = i === data.members.length - 1}
				<a href="/players/{m.player_id}" style="display:flex; align-items:center; padding:12px 14px; border-bottom:{isLast ? 'none' : '1px solid var(--rule)'}; text-decoration:none; color:inherit">
					<div style="width:22px; font-size:13px; font-weight:800; color:{i < 3 ? 'var(--accent)' : 'var(--ink3)'}">#{i + 1}</div>
					<div style="width:36px; height:36px; border-radius:999px; background:{playerColor(m.player_id)}; display:flex; align-items:center; justify-content:center; font-size:12px; font-weight:800; color:#3A2E1A; margin-right:10px; flex-shrink:0">{initials(m.player_name)}</div>
					<div style="flex:1">
						<div style="font-size:14px; font-weight:800; color:var(--ink)">{m.player_name}</div>
						<div style="font-size:11px; color:var(--ink2); margin-top:1px">{m.sessions} sess · {Math.round(m.win_rate * 100)}% win</div>
					</div>
					<div style="font-size:15px; font-weight:800; font-feature-settings:'tnum' 1; color:{m.net_profit >= 0 ? 'var(--pos)' : 'var(--neg)'}">
						{formatProfit(m.net_profit)}
					</div>
				</a>
			{/each}
		</div>
	{/if}
</div>

<!-- Group sessions -->
{#if data.sessions.length > 0}
<div style="padding:20px 20px 0">
	<div style="font-size:12px; font-weight:800; letter-spacing:1.4px; text-transform:uppercase; color:var(--ink2); margin-bottom:12px">
		Sessions · {data.sessions.length}
	</div>
	{#each data.sessions as s}
		<a href="/sessions/{s.id}" style="display:block; background:var(--card); border:1.5px solid var(--rule); border-radius:16px; padding:13px 14px; margin-bottom:8px; text-decoration:none; color:inherit">
			<div style="display:flex; justify-content:space-between; align-items:baseline">
				<div style="font-size:14px; font-weight:800; color:var(--ink)">{s.location || s.name}</div>
				<div style="font-size:11px; color:var(--ink2); font-weight:700">{s.date}</div>
			</div>
			<div style="display:flex; gap:6px; margin-top:6px; flex-wrap:wrap">
				{#if s.blinds}<span style="background:var(--bg); padding:3px 9px; border-radius:999px; font-size:11px; font-weight:700; color:var(--ink2)">{s.blinds}</span>{/if}
				{#if s.hours}<span style="background:var(--bg); padding:3px 9px; border-radius:999px; font-size:11px; font-weight:700; color:var(--ink2)">{s.hours}h</span>{/if}
			</div>
		</a>
	{/each}
</div>
{/if}

<div style="height:32px"></div>
