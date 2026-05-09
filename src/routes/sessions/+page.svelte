<script lang="ts">
	import type { PageData } from './$types';
	import { formatProfit } from '$lib/utils';

	export let data: PageData;
</script>

<svelte:head>
	<title>chiplist · Sessions</title>
</svelte:head>

<!-- Header -->
<div style="padding: 56px 20px 0">
	<div class="pop-display" style="font-size:32px; margin-top:8px; line-height:1; color:var(--ink)">Sessions</div>
	<div style="font-size:13px; color:var(--ink2); margin-top:6px">
		{data.sessions.length} nights
		{#if data.total_volume > 0} · ${(data.total_volume / 100).toLocaleString()} on the table{/if}
	</div>
</div>

<div style="padding: 20px 20px 0">
	{#if data.sessions.length === 0}
		<div style="text-align:center; padding:48px 0; color:var(--ink3)">
			<div style="font-size:16px; font-weight:800; margin-bottom:8px">No sessions yet</div>
			<a href="/sessions/new" style="display:inline-block; background:var(--accent); color:white; padding:12px 24px; border-radius:999px; font-weight:800; font-size:13px; text-decoration:none; border:2px solid var(--ink); box-shadow:0 3px 0 var(--ink)">
				Log your first session
			</a>
		</div>
	{:else}
		{#each data.sessions as s}
			<a href="/sessions/{s.id}" class="card">
				<div class="card-head">
					<div>
						<div style="font-size:16px; font-weight:800; color:var(--ink)">{s.location || s.name}</div>
						<div style="font-size:11px; color:var(--ink2); margin-top:2px; font-weight:700">{s.date}</div>
					</div>
				</div>
				<div class="chips">
					{#if s.blinds}<span class="chip">{s.blinds}</span>{/if}
					{#if s.player_count > 0}<span class="chip">{s.player_count} seats</span>{/if}
					{#if s.hours}<span class="chip">{s.hours}h</span>{/if}
					{#if s.top_winner?.name}
						<span class="chip chip-pos">
							👑 {s.top_winner.name.split(' ')[0]} {formatProfit(s.top_winner.net)}
						</span>
					{/if}
				</div>
			</a>
		{/each}
	{/if}
</div>

<style>
.card {
	background: var(--card);
	border-radius: 18px;
	padding: 14px 16px;
	margin-bottom: 10px;
	border: 1.5px solid var(--rule);
	text-decoration: none;
	color: inherit;
	display: block;
}
.card-head { display: flex; justify-content: space-between; align-items: flex-start; }
.chips { display: flex; gap: 6px; margin-top: 10px; flex-wrap: wrap; }
.chip { background: var(--bg); padding: 4px 10px; border-radius: 999px; font-size: 11px; font-weight: 700; color: var(--ink2); }
.chip-pos { background: var(--pos-bg); color: var(--pos); font-weight: 800; }
</style>
