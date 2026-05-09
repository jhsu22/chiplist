<script lang="ts">
	import type { PageData } from './$types';
	import { enhance } from '$app/forms';
	import { formatProfit, formatMoney, calculateSettlements, playerColor, initials } from '$lib/utils';

	export let data: PageData;

	$: entries = data.entries;
	$: session = data.session;
	$: sorted = [...entries].sort((a, b) => (b.cash_out - b.buy_in) - (a.cash_out - a.buy_in));
	$: totalBuyIn = entries.reduce((s, e) => s + e.buy_in, 0);
	$: settlements = calculateSettlements(
		entries.map((e) => ({ player: e.player_name, net: e.cash_out - e.buy_in }))
	);
</script>

<svelte:head>
	<title>chiplist · {session.location || session.name}</title>
</svelte:head>

<!-- Header -->
<div class="page-header">
	<a href="/sessions" class="back-btn">
		<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M15 6l-6 6 6 6"/></svg>
	</a>
	<div style="display:flex; align-items:center; gap:8px">
		<a href="/sessions/{session.id}/edit" class="edit-btn">Edit</a>
		<form method="POST" action="?/delete_session" use:enhance>
		<button type="submit" class="delete-btn" on:click={(e) => { if (!confirm('Delete this session?')) e.preventDefault(); }}>
			<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
				<polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6"/><path d="M10 11v6M14 11v6"/><path d="M9 6V4h6v2"/>
			</svg>
		</button>
		</form>
	</div>
</div>

<!-- Hero -->
<div style="padding: 20px 20px 0">
	<div style="font-size:11px; color:var(--accent); font-weight:800; letter-spacing:1.4px; text-transform:uppercase">{session.date}</div>
	<div class="pop-display" style="font-size:30px; margin-top:4px; line-height:1; color:var(--ink)">{session.location || session.name}</div>
	<div class="chips" style="margin-top:12px">
		{#if session.blinds}<span class="chip chip-cobalt">{session.blinds} NL</span>{/if}
		{#if totalBuyIn > 0}<span class="chip chip-muted">{formatMoney(totalBuyIn / entries.length)} buy-in</span>{/if}
		{#if session.hours}<span class="chip chip-muted">{session.hours}h</span>{/if}
		{#if totalBuyIn > 0}<span class="chip chip-muted">{formatMoney(totalBuyIn)} on table</span>{/if}
	</div>
</div>

<!-- Results board -->
{#if sorted.length > 0}
<div style="padding: 24px 20px 0">
	<div class="section-title" style="margin-bottom:12px">Results</div>
	<div class="results-card">
		{#each sorted as e, i}
			{@const net = e.cash_out - e.buy_in}
			{@const playerId = data.players.find(p => p.name === e.player_name)?.id ?? 0}
			<a href="/players/{playerId}" class="result-row" class:last={i === sorted.length - 1}>
				<div class="result-rank" style="color:{i === 0 ? 'var(--accent)' : 'var(--ink3)'}">{i + 1}</div>
				<div class="result-avatar" style="background:{playerColor(playerId)}">{initials(e.player_name)}</div>
				<div class="result-info">
					<div class="result-name">
						{e.player_name}
						{#if i === 0}<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 17l2-9 4 4 3-7 3 7 4-4 2 9z"/><path d="M4 20h16"/></svg>{/if}
					</div>
					<div class="result-sub pop-mono">{formatMoney(e.buy_in)} → {formatMoney(e.cash_out)}</div>
				</div>
				<div class="result-net pop-mono" style="color:{net >= 0 ? 'var(--pos)' : 'var(--neg)'}">{formatProfit(net)}</div>
			</a>
		{/each}
	</div>
</div>
{/if}

<!-- Settle-up -->
{#if settlements.length > 0}
<div style="padding: 28px 20px 0">
	<div class="section-title">Settle-up</div>
	<div class="pop-display" style="font-size:18px; margin:8px 0 12px; color:var(--ink)">{settlements.length} payment{settlements.length > 1 ? 's' : ''} to balance the table</div>
	{#each settlements as s}
		{@const fromId = data.players.find(p => p.name === s.from_player)?.id ?? 0}
		{@const toId = data.players.find(p => p.name === s.to_player)?.id ?? 0}
		<div class="settle-row">
			<div class="settle-avatar" style="background:{playerColor(fromId)}">{initials(s.from_player)}</div>
			<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--ink3)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h14M13 6l6 6-6 6"/></svg>
			<div class="settle-avatar" style="background:{playerColor(toId)}">{initials(s.to_player)}</div>
			<div class="settle-names">{s.from_player.split(' ')[0]} → {s.to_player.split(' ')[0]}</div>
			<div class="settle-amt pop-mono">{formatMoney(s.amount)}</div>
			<div class="settle-badge">UNPAID</div>
		</div>
	{/each}
</div>
{/if}

<!-- Add/edit entries (inline, below the design) -->
{#if entries.length === 0}
<div style="padding: 24px 20px 0">
	<a href="/sessions/{session.id}/entries" style="display:block; text-align:center; padding:14px; background:var(--bg2); border-radius:14px; border:1.5px dashed var(--ink2); font-size:13px; font-weight:800; color:var(--ink2); text-decoration:none">
		+ Add player results
	</a>
</div>
{/if}

<style>
.page-header {
	padding: 56px 20px 0;
	display: flex;
	justify-content: space-between;
	align-items: center;
}
.back-btn {
	width: 36px; height: 36px; border-radius: 999px;
	background: var(--card); border: 1.5px solid var(--ink);
	display: flex; align-items: center; justify-content: center;
	color: var(--ink); text-decoration: none;
}
.edit-btn {
	padding: 6px 14px; border-radius: 999px;
	background: var(--bg2); border: 1.5px solid var(--rule);
	font-size: 12px; font-weight: 800; color: var(--ink);
	text-decoration: none;
}
.delete-btn {
	width: 36px; height: 36px; border-radius: 999px;
	background: var(--neg-bg); border: 1.5px solid var(--neg);
	display: flex; align-items: center; justify-content: center;
	color: var(--neg); cursor: pointer;
}
.section-title {
	font-size: 12px; font-weight: 800; letter-spacing: 1.4px;
	text-transform: uppercase; color: var(--ink2);
}
.chips { display: flex; gap: 8px; flex-wrap: wrap; }
.chip { padding: 6px 12px; border-radius: 999px; font-size: 12px; font-weight: 800; }
.chip-cobalt { background: var(--cobalt); color: white; }
.chip-muted { background: var(--bg2); color: var(--ink); }

.results-card {
	background: var(--card);
	border: 1.5px solid var(--rule);
	border-radius: 18px;
	overflow: hidden;
}
.result-row {
	display: flex; align-items: center;
	padding: 14px 16px;
	border-bottom: 1px solid var(--rule);
	text-decoration: none; color: inherit;
}
.result-row.last { border-bottom: none; }
.result-rank { width: 24px; font-size: 12px; font-weight: 800; }
.result-avatar {
	width: 34px; height: 34px; border-radius: 999px; margin-right: 12px;
	display: flex; align-items: center; justify-content: center;
	font-size: 11px; font-weight: 800; color: #3A2E1A;
}
.result-info { flex: 1; }
.result-name {
	font-size: 14px; font-weight: 800; color: var(--ink);
	display: flex; align-items: center; gap: 6px;
}
.result-sub { font-size: 11px; color: var(--ink2); margin-top: 1px; }
.result-net { font-size: 18px; font-weight: 800; }

.settle-row {
	display: flex; align-items: center; gap: 10px;
	padding: 12px 14px;
	background: var(--card); border-radius: 14px;
	margin-bottom: 8px; border: 1.5px solid var(--rule);
}
.settle-avatar {
	width: 32px; height: 32px; border-radius: 999px;
	display: flex; align-items: center; justify-content: center;
	font-size: 11px; font-weight: 800; color: #3A2E1A;
}
.settle-names { flex: 1; margin-left: 4px; font-size: 13px; font-weight: 700; color: var(--ink); }
.settle-amt { font-size: 16px; font-weight: 800; color: var(--ink); }
.settle-badge {
	padding: 4px 10px; border-radius: 999px;
	background: var(--pos-bg); color: var(--pos);
	font-size: 10px; font-weight: 800;
}
</style>
