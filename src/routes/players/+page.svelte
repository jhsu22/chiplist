<script lang="ts">
	import type { ActionData, PageData } from './$types';
	import { enhance } from '$app/forms';
	import { formatProfit, playerColor, initials } from '$lib/utils';

	export let data: PageData;
	export let form: ActionData;

	let showAdd = false;
	let newName = '';
</script>

<svelte:head>
	<title>chiplist · Players</title>
</svelte:head>

<!-- Header -->
<div style="padding: 20px 20px 0">
	<div class="pop-display" style="font-size:32px; margin-top:8px; line-height:1; color:var(--ink)">Players</div>
	<div style="font-size:13px; color:var(--ink2); margin-top:6px">{data.players.length} regular{data.players.length !== 1 ? 's' : ''}</div>
</div>

<div style="padding: 20px 20px 0">
	{#each data.players as p, i}
		<a href="/players/{p.id}" class="row">
			<div class="rank" style="color:{i < 3 ? 'var(--accent)' : 'var(--ink3)'}">{i + 1}</div>
			<div class="avatar" style="background:{playerColor(p.id)}">{initials(p.name)}</div>
			<div class="info">
				<div class="name">{p.name}</div>
				<div class="sub">
					{Math.round(p.win_rate * 100)}% · {p.sessions} sess
					{#if p.sessions > 0} · {formatProfit(p.avg)}/sess{/if}
				</div>
			</div>
			<div class="profit pop-mono" style="color:{p.net_profit >= 0 ? 'var(--pos)' : 'var(--neg)'}">{formatProfit(p.net_profit)}</div>
		</a>
	{/each}

	<!-- Add player -->
	{#if showAdd}
		<form
			method="POST"
			action="?/create"
			use:enhance={() => async ({ update }) => { await update(); showAdd = false; newName = ''; }}
			style="background:var(--card); border:1.5px solid var(--rule); border-radius:16px; padding:14px 16px; margin-bottom:8px; display:flex; gap:8px; align-items:center"
		>
			{#if form?.error}
				<div style="font-size:12px; color:var(--neg); font-weight:700">{form.error}</div>
			{/if}
			<input
				name="name"
				type="text"
				bind:value={newName}
				placeholder="Player name"
				required
				autofocus
				style="flex:1; padding:8px 0; border:none; outline:none; font-family:inherit; font-size:14px; font-weight:700; color:var(--ink); background:transparent"
			/>
			<button type="button" on:click={() => showAdd = false} style="color:var(--ink3); background:none; border:none; font-size:20px; cursor:pointer; padding:0; line-height:1">×</button>
			<button type="submit" style="background:var(--ink); color:var(--bg); padding:8px 16px; border-radius:999px; font-size:13px; font-weight:800; border:none; cursor:pointer; font-family:inherit">Add</button>
		</form>
	{:else}
		<button
			type="button"
			class="add-row"
			on:click={() => showAdd = true}
		>
			<div class="add-icon">
				<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 5v14M5 12h14"/></svg>
			</div>
			<div style="font-size:14px; font-weight:800; color:var(--ink2)">Add a new player</div>
		</button>
	{/if}
</div>

<style>
.row {
	display: flex; align-items: center;
	padding: 14px 16px; background: var(--card); border-radius: 16px;
	margin-bottom: 8px; border: 1.5px solid var(--rule);
	text-decoration: none; color: inherit;
}
.rank { width: 24px; font-size: 13px; font-weight: 800; }
.avatar {
	width: 42px; height: 42px; border-radius: 999px; margin-right: 12px;
	display: flex; align-items: center; justify-content: center;
	font-size: 14px; font-weight: 800; color: #3A2E1A;
}
.info { flex: 1; }
.name { font-size: 15px; font-weight: 800; color: var(--ink); }
.sub { font-size: 11px; color: var(--ink2); margin-top: 1px; }
.profit { font-size: 17px; font-weight: 800; }

.add-row {
	background: var(--card); border: 1.5px dashed var(--rule);
	border-radius: 16px; padding: 14px 16px;
	display: flex; align-items: center; gap: 12px;
	cursor: pointer; width: 100%; font-family: inherit;
}
.add-icon {
	width: 42px; height: 42px; border-radius: 999px;
	background: var(--bg2); display: flex; align-items: center;
	justify-content: center; color: var(--ink2);
}
</style>
