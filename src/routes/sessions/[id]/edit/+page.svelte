<script lang="ts">
	import type { PageData } from './$types';
	import { playerColor, initials, fmtDollars, calculateSettlements } from '$lib/utils';

	export let data: PageData;

	const s = data.session;

	// Metadata fields
	let locationText = s.location ?? s.name ?? '';
	let dateStr = s.date;
	let selectedBlind = s.blinds ?? '1/2';
	let hours = s.hours ?? 3;

	const DEFAULT_BLINDS = [
		{ id: '0.05/0.10', label: '$0.05 / $0.10' },
		{ id: '0.10/0.20', label: '$0.10 / $0.20' },
		{ id: '0.25/0.50', label: '$0.25 / $0.50' },
		{ id: '0.50/1',    label: '$0.50 / $1' },
		{ id: '1/2',       label: '$1 / $2' },
		{ id: '1/3',       label: '$1 / $3' },
	];
	let customBlinds: { id: string; label: string }[] = [];
	$: allBlinds = [...DEFAULT_BLINDS, ...customBlinds];
	let showCustomBlinds = false;
	let customSB = '';
	let customBB = '';
	function addCustomBlinds() {
		const sb = customSB.trim(); const bb = customBB.trim();
		if (!sb || !bb) return;
		const id = `${sb}/${bb}`;
		if (!allBlinds.find(b => b.id === id)) customBlinds = [...customBlinds, { id, label: `$${sb} / $${bb}` }];
		selectedBlind = id; showCustomBlinds = false; customSB = ''; customBB = '';
	}

	// Per-player ending stacks — initialise from existing entries
	// cashoutStrs[player_id] = string of the cash-out dollar amount
	const initCO: Record<number, string> = {};
	const initBI: Record<number, number> = {}; // keep original buy-ins
	for (const e of data.entries) {
		initCO[e.player_id] = String(e.cash_out / 100);
		initBI[e.player_id] = e.buy_in;
	}
	let cashoutStrs: Record<number, string> = initCO;

	function parseCO(id: number): number {
		const v = parseFloat(cashoutStrs[id] ?? '');
		return isNaN(v) ? 0 : v;
	}

	const STEP = 5;
	function adjCO(id: number, d: number) {
		const cur = parseCO(id);
		cashoutStrs = { ...cashoutStrs, [id]: String(Math.max(0, Math.round((cur + d) * 100) / 100)) };
	}

	// Derive buy-in from the most common buy_in across entries (in dollars)
	$: refBuyIn = (() => {
		if (data.entries.length === 0) return 20;
		return data.entries[0].buy_in / 100;
	})();

	$: total = data.entries.reduce((s, e) => {
		const co = parseFloat(cashoutStrs[e.player_id] ?? '');
		const bi = e.buy_in / 100;
		return s + (isNaN(co) ? 0 : co - bi);
	}, 0);

	$: balanced = Math.abs(total) < 0.005;

	$: settlements = balanced && data.entries.length > 0
		? calculateSettlements(data.entries.map(e => ({
				player: e.player_name,
				net: Math.round((parseCO(e.player_id) - e.buy_in / 100) * 100),
			})))
		: [];

	function autoBalance() {
		const first = data.entries[0];
		if (!first) return;
		const cur = parseCO(first.player_id);
		cashoutStrs = { ...cashoutStrs, [first.player_id]: String(Math.max(0, Math.round((cur - total) * 100) / 100)) };
	}

	// Build submission payload
	$: entriesJson = JSON.stringify(data.entries.map(e => ({
		player_id: e.player_id,
		buy_in_cents: e.buy_in,
		cash_out_cents: Math.round(parseCO(e.player_id) * 100),
	})));
</script>

<svelte:head>
	<title>chiplist · Edit Session</title>
</svelte:head>

<!-- Header -->
<div style="padding:56px 20px 0; display:flex; justify-content:space-between; align-items:center">
	<a href="/sessions/{s.id}" class="back-btn">
		<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M15 6l-6 6 6 6"/></svg>
	</a>
	<div style="font-size:13px; font-weight:800; letter-spacing:1.4px; text-transform:uppercase; color:var(--ink2)">Edit Session</div>
	<div style="width:36px"></div>
</div>

<div style="padding: 20px 20px 8px">

	<!-- Metadata -->
	<div class="field-label">Location</div>
	<input type="text" bind:value={locationText} placeholder="Alex's place…"
		style="width:100%; padding:12px 14px; border-radius:14px; border:1.5px solid var(--rule); background:var(--card); font-family:inherit; font-size:14px; font-weight:700; color:var(--ink); outline:none; margin-top:8px; margin-bottom:16px"/>

	<div class="field-label">Date</div>
	<input type="date" bind:value={dateStr}
		style="width:100%; padding:10px 12px; border-radius:12px; border:1.5px solid var(--rule); background:var(--card); font-family:inherit; font-size:14px; color:var(--ink); outline:none; margin-top:8px; margin-bottom:16px"/>

	<div class="field-label">Blinds</div>
	<div class="pop-scroll" style="display:flex; gap:8px; margin-top:10px; overflow-x:auto; padding-bottom:4px; margin-bottom:4px">
		{#each allBlinds as b}
			<button type="button" class="blind-btn" class:selected={selectedBlind === b.id}
				on:click={() => { selectedBlind = b.id; showCustomBlinds = false; }}>
				{b.label}
			</button>
		{/each}
		<button type="button" class="blind-btn" class:selected={showCustomBlinds}
			on:click={() => showCustomBlinds = !showCustomBlinds}>
			+ Custom
		</button>
	</div>
	{#if showCustomBlinds}
		<div style="display:flex; gap:8px; margin-top:8px; align-items:flex-end; margin-bottom:8px">
			<div style="flex:1">
				<div style="font-size:10px; font-weight:800; color:var(--ink3); margin-bottom:4px">SMALL</div>
				<input type="text" bind:value={customSB} placeholder="0.50"
					style="width:100%; padding:10px 12px; border-radius:12px; border:1.5px solid var(--rule); background:var(--card); font-family:inherit; font-size:14px; font-weight:700; color:var(--ink); outline:none"/>
			</div>
			<div style="font-size:18px; color:var(--ink3); font-weight:800; padding-bottom:10px">/</div>
			<div style="flex:1">
				<div style="font-size:10px; font-weight:800; color:var(--ink3); margin-bottom:4px">BIG</div>
				<input type="text" bind:value={customBB} placeholder="1"
					style="width:100%; padding:10px 12px; border-radius:12px; border:1.5px solid var(--rule); background:var(--card); font-family:inherit; font-size:14px; font-weight:700; color:var(--ink); outline:none"/>
			</div>
			<button type="button" on:click={addCustomBlinds}
				style="padding:10px 16px; background:var(--ink); color:var(--bg); border-radius:12px; border:none; font-size:13px; font-weight:800; cursor:pointer; font-family:inherit; white-space:nowrap">
				Add
			</button>
		</div>
	{/if}

	<div class="field-label" style="margin-top:16px">Hours</div>
	<div style="display:flex; align-items:center; gap:12px; margin-top:10px; background:var(--card); border:1.5px solid var(--rule); border-radius:16px; padding:14px 16px; margin-bottom:24px">
		<button type="button" class="step-btn" on:click={() => hours = Math.max(0.5, hours - 0.5)}>−</button>
		<div class="pop-display pop-mono" style="flex:1; text-align:center; font-size:28px; color:var(--ink)">{hours}h</div>
		<button type="button" class="step-btn" on:click={() => hours = hours + 0.5}>+</button>
	</div>

	<!-- Results -->
	{#if data.entries.length > 0}
		<div style="height:1px; background:var(--rule); margin-bottom:24px"></div>

		<!-- Balance indicator -->
		<div style="padding:12px 14px; background:{balanced ? 'var(--pos-bg)' : 'var(--neg-bg)'}; border:2px solid {balanced ? 'var(--pos)' : 'var(--neg)'}; border-radius:14px; display:flex; align-items:center; gap:10px; margin-bottom:14px">
			<div style="width:28px; height:28px; border-radius:99px; background:{balanced ? 'var(--pos)' : 'var(--neg)'}; display:flex; align-items:center; justify-content:center; flex-shrink:0">
				<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="3" stroke-linecap="round" stroke-linejoin="round">
					{#if balanced}<path d="M5 12l5 5 9-11"/>
					{:else}<path d="M13 3L4 14h6l-1 7 9-11h-6z"/>{/if}
				</svg>
			</div>
			<div style="font-size:13px; font-weight:800; color:{balanced ? 'var(--pos)' : 'var(--neg)'}">
				{balanced ? 'Table balanced' : `Off by ${fmtDollars(total)}`}
			</div>
		</div>

		<div class="field-label" style="margin-bottom:10px">Ending stacks</div>
		{#each data.entries as e (e.player_id)}
			{@const playerId = e.player_id}
			{@const net = parseCO(playerId) - e.buy_in / 100}
			<div style="display:flex; align-items:center; gap:8px; padding:10px 12px; background:var(--card); border:1.5px solid var(--rule); border-radius:14px; margin-bottom:8px">
				<div style="width:30px; height:30px; border-radius:99px; background:{playerColor(playerId)}; display:flex; align-items:center; justify-content:center; font-size:11px; font-weight:800; color:#3A2E1A; flex-shrink:0">{initials(e.player_name)}</div>
				<div style="width:52px; font-size:13px; font-weight:800; color:var(--ink); flex-shrink:0">{e.player_name.split(' ')[0]}</div>
				<button type="button" class="step-btn" on:click={() => adjCO(playerId, -STEP)}>−</button>
				<div style="flex:1; display:flex; align-items:center; justify-content:center; gap:2px; min-width:0">
					<span style="font-size:14px; font-weight:800; color:var(--ink3)">$</span>
					<input type="text" inputmode="decimal"
						bind:value={cashoutStrs[playerId]}
						style="width:72px; text-align:center; font-size:18px; font-weight:800; letter-spacing:-0.04em; font-feature-settings:'tnum' 1; color:var(--ink); background:transparent; border:none; outline:none; font-family:inherit"/>
				</div>
				<button type="button" class="step-btn" on:click={() => adjCO(playerId, STEP)}>+</button>
				<div style="width:46px; text-align:right; font-size:12px; font-weight:800; flex-shrink:0; font-feature-settings:'tnum' 1"
					style:color={net === 0 ? 'var(--ink3)' : net > 0 ? 'var(--pos)' : 'var(--neg)'}>
					{net === 0 ? '±0' : fmtDollars(net)}
				</div>
			</div>
		{/each}

		{#if !balanced}
			<button type="button" class="auto-balance-btn" on:click={autoBalance}>
				Auto-balance · adjust {data.entries[0]?.player_name.split(' ')[0]} by {fmtDollars(-total)}
			</button>
		{/if}
	{/if}
</div>

<!-- Save -->
<div class="cta-wrap">
	<form method="POST">
		<input type="hidden" name="location" value={locationText} />
		<input type="hidden" name="date" value={dateStr} />
		<input type="hidden" name="blinds" value={selectedBlind} />
		<input type="hidden" name="hours" value={hours} />
		<input type="hidden" name="entries" value={entriesJson} />
		<button type="submit" class="cta-btn">Save changes</button>
	</form>
</div>

<style>
.back-btn {
	width:36px; height:36px; border-radius:999px; background:var(--card); border:1.5px solid var(--ink);
	display:flex; align-items:center; justify-content:center; color:var(--ink); text-decoration:none;
}
.field-label { font-size:12px; font-weight:800; letter-spacing:1.3px; text-transform:uppercase; color:var(--ink2); }
.blind-btn {
	background:var(--card); color:var(--ink); border:1.5px solid var(--rule); border-radius:14px;
	padding:10px 14px; cursor:pointer; flex-shrink:0; font-family:inherit; font-size:13px; font-weight:800;
}
.blind-btn.selected { background:var(--ink); color:var(--bg); border-color:var(--ink); }
.step-btn {
	width:28px; height:28px; border-radius:99px; flex-shrink:0; background:var(--bg2); border:none;
	display:flex; align-items:center; justify-content:center; cursor:pointer; font-weight:800; font-size:16px; color:var(--ink); font-family:inherit;
}
.auto-balance-btn {
	width:100%; margin-top:6px; padding:10px 12px; background:var(--bg2); border:1.5px dashed var(--ink2);
	border-radius:12px; font-size:12px; font-weight:800; color:var(--ink2); text-align:center; cursor:pointer; font-family:inherit;
}
.cta-wrap { position:sticky; bottom:16px; padding:0 20px; z-index:10; }
.cta-btn {
	display:block; width:100%; background:var(--ink); color:var(--bg);
	padding:16px 0; border-radius:999px; text-align:center; font-size:15px; font-weight:800;
	box-shadow:0 3px 0 rgba(0,0,0,0.25); cursor:pointer; border:none; font-family:inherit;
}
</style>
