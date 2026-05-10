<script lang="ts">
	import type { PageData } from './$types';
	import { playerColor, initials, fmtDollars, calculateSettlements } from '$lib/utils';

	export let data: PageData;

	let step = 1;

	// ── Step 1 ──────────────────────────────────────────────────
	let dateChoice = 'Today';
	let customDate = '';
	let locationText = '';

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
	let selectedBlind = '0.25/0.50';
	let showCustomBlinds = false;
	let customSB = '';
	let customBB = '';
	function addCustomBlinds() {
		const sb = customSB.trim();
		const bb = customBB.trim();
		if (!sb || !bb) return;
		const id = `${sb}/${bb}`;
		if (!allBlinds.find(b => b.id === id)) {
			customBlinds = [...customBlinds, { id, label: `$${sb} / $${bb}` }];
		}
		selectedBlind = id;
		showCustomBlinds = false;
		customSB = '';
		customBB = '';
	}

	const PRESET_BUY_INS = [5, 10, 20, 40, 100, 200];
	let buyIn = 20;
	let buyInStr = '20';
	function selectPresetBuyIn(v: number) {
		buyIn = v;
		buyInStr = String(v);
	}
	function onBuyInInput(e: Event) {
		buyInStr = (e.currentTarget as HTMLInputElement).value;
		const parsed = parseFloat(buyInStr);
		if (!isNaN(parsed) && parsed > 0) buyIn = parsed;
	}

	let hours = 3;
	let selectedGroup = '';

	// When a group is selected, narrow step 2 to that group's members only
	$: stepPlayers = (() => {
		if (!selectedGroup) return data.players;
		const g = data.groups.find(g => String(g.id) === String(selectedGroup));
		if (!g || !g.member_names?.length) return data.players;
		return g.member_names.map((m: { id: number; name: string }) => ({ ...m, color: '', bio: '', user_id: null, created_at: '' }));
	})();

	// ── Step 2 ──────────────────────────────────────────────────
	let selectedPlayers: number[] = [];
	function togglePlayer(id: number) {
		selectedPlayers = selectedPlayers.includes(id)
			? selectedPlayers.filter(x => x !== id)
			: [...selectedPlayers, id];
	}

	// ── Step 3 ──────────────────────────────────────────────────
	// Use strings for inputs so typing/deleting works freely.
	// Svelte tracks string object reassignments correctly.
	let resultMode: 'net' | 'stack' = 'stack';
	let cashoutStrs: Record<number, string> = {};
	let netStrs: Record<number, string> = {};

	// Initialize entries when we arrive at step 3.
	// Use assignment (not mutation) so Svelte picks up the change.
	function initStep3() {
		const co = { ...cashoutStrs };
		const nt = { ...netStrs };
		selectedPlayers.forEach(id => {
			if (co[id] === undefined) co[id] = String(buyIn);
			if (nt[id] === undefined) nt[id] = '0';
		});
		cashoutStrs = co;
		netStrs = nt;
	}

	// Parsed helpers — used only in expressions, not as reactive deps
	function parseCO(id: number) {
		const v = parseFloat(cashoutStrs[id] ?? '');
		return isNaN(v) ? 0 : v;
	}
	function parseNT(id: number) {
		const v = parseFloat(netStrs[id] ?? '');
		return isNaN(v) ? 0 : v;
	}

	// Reactively derived total — read strings directly so Svelte tracks them
	$: total = resultMode === 'stack'
		? selectedPlayers.reduce((s, id) => {
				const v = parseFloat(cashoutStrs[id] ?? '');
				return s + (isNaN(v) ? 0 : v) - buyIn;
			}, 0)
		: selectedPlayers.reduce((s, id) => {
				const v = parseFloat(netStrs[id] ?? '');
				return s + (isNaN(v) ? 0 : v);
			}, 0);

	$: balanced = Math.abs(total) < 0.005;

	// Read strings directly (no helper fns) so Svelte tracks cashoutStrs/netStrs as deps
	$: settlements = balanced && selectedPlayers.length > 0
		? calculateSettlements(selectedPlayers.map(id => {
				const net = resultMode === 'stack'
					? (parseFloat(cashoutStrs[id] ?? '') || 0) - buyIn
					: (parseFloat(netStrs[id] ?? '') || 0);
				return { player: data.players.find(p => p.id === id)?.name ?? String(id), net: Math.round(net * 100) };
			}))
		: [];

	// 10× big blind, derived from selectedBlind (e.g. "0.25/0.50" → BB=0.50 → STEP=5)
	$: STEP = (() => {
		const bb = parseFloat(selectedBlind.split('/')[1] ?? '1');
		return Math.round((isNaN(bb) ? 1 : bb) * 10 * 100) / 100;
	})();

	function adjCO(id: number, d: number) {
		const cur = parseFloat(cashoutStrs[id] ?? '') || 0;
		cashoutStrs = { ...cashoutStrs, [id]: String(Math.max(0, Math.round((cur + d) * 100) / 100)) };
	}
	function adjNT(id: number, d: number) {
		const cur = parseFloat(netStrs[id] ?? '') || 0;
		netStrs = { ...netStrs, [id]: String(Math.round((cur + d) * 100) / 100) };
	}

	function autoBalance() {
		const first = selectedPlayers[0];
		if (resultMode === 'stack') {
			const cur = parseCO(first);
			cashoutStrs = { ...cashoutStrs, [first]: String(Math.max(0, Math.round((cur - total) * 100) / 100)) };
		} else {
			const cur = parseNT(first);
			netStrs = { ...netStrs, [first]: String(Math.round((cur - total) * 100) / 100) };
		}
	}

	// Date string for submission
	$: dateStr = (() => {
		if (dateChoice === 'Today') return new Date().toISOString().split('T')[0];
		if (dateChoice === 'Yesterday') {
			const d = new Date(); d.setDate(d.getDate() - 1);
			return d.toISOString().split('T')[0];
		}
		return customDate || new Date().toISOString().split('T')[0];
	})();

	// Read strings directly so Svelte tracks cashoutStrs/netStrs as deps
	$: entriesJson = JSON.stringify(selectedPlayers.map(id => {
		const net = resultMode === 'stack'
			? (parseFloat(cashoutStrs[id] ?? '') || 0) - buyIn
			: (parseFloat(netStrs[id] ?? '') || 0);
		return { player_id: id, net };
	}));
</script>

<svelte:head>
	<title>chiplist · New Session</title>
</svelte:head>

<!-- Step header -->
<div style="padding: 20px 20px 0; display:flex; justify-content:space-between; align-items:center">
	<button type="button" class="back-btn"
		on:click={() => { if (step === 1) history.back(); else step--; }}>
		<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
			{#if step === 1}<path d="M6 6l12 12M6 18L18 6"/>
			{:else}<path d="M15 6l-6 6 6 6"/>{/if}
		</svg>
	</button>
	<div style="display:flex; gap:6px">
		{#each [1,2,3] as n}
			<div style="width:26px; height:6px; border-radius:99px; background:{n <= step ? 'var(--ink)' : 'var(--rule)'}"></div>
		{/each}
	</div>
	<div style="width:36px"></div>
</div>

{#if step === 1}
<div style="padding: 20px 20px 160px">
	<div style="font-size:13px; color:var(--accent); font-weight:800; letter-spacing:1.4px; text-transform:uppercase">Step 1</div>
	<div class="pop-display" style="font-size:36px; margin-top:6px; line-height:1; color:var(--ink)">What's the<br/>setup?</div>

	<div style="margin-top:22px; display:flex; gap:8px">
		{#each ['Today','Yesterday','Pick date'] as d}
			<button type="button" class="date-btn" class:selected={dateChoice === d} on:click={() => dateChoice = d}>{d}</button>
		{/each}
	</div>
	{#if dateChoice === 'Pick date'}
		<input type="date" bind:value={customDate}
			style="margin-top:8px; width:100%; max-width:100%; padding:10px 12px; border-radius:12px; border:1.5px solid var(--rule); background:var(--card); font-family:inherit; font-size:14px; color:var(--ink); outline:none; -webkit-appearance:none; appearance:none"/>
	{/if}

	<div class="field-label" style="margin-top:22px">Location</div>
	<input type="text" bind:value={locationText} placeholder="Alex's place, The Card Room…"
		style="width:100%; padding:12px 14px; border-radius:14px; border:1.5px solid var(--rule); background:var(--card); font-family:inherit; font-size:14px; font-weight:700; color:var(--ink); outline:none; margin-top:8px"/>

	<div class="field-label" style="margin-top:22px">Blinds</div>
	<div class="pop-scroll" style="display:flex; gap:8px; margin-top:10px; overflow-x:auto; padding-bottom:4px">
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
		<div style="display:flex; gap:8px; margin-top:8px; align-items:flex-end">
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
				style="padding:10px 16px; background:var(--ink); color:var(--bg); border-radius:12px; border:none; font-size:13px; font-weight:800; cursor:pointer; font-family:inherit; white-space:nowrap; margin-bottom:0">
				Add
			</button>
		</div>
	{/if}

	<div class="field-label" style="margin-top:22px">Buy-in</div>
	<div style="margin-top:10px; background:var(--card); border:1.5px solid var(--rule); border-radius:16px; padding:14px 16px">
		<div style="display:flex; align-items:center; gap:4px">
			<span class="pop-display" style="font-size:32px; color:var(--accent)">$</span>
			<input type="text" inputmode="decimal" value={buyInStr} on:input={onBuyInInput}
				style="flex:1; font-size:32px; font-weight:800; letter-spacing:-0.04em; color:var(--accent); background:transparent; border:none; outline:none; font-family:inherit; min-width:0"/>
		</div>
		<div style="display:flex; gap:6px; margin-top:10px; flex-wrap:wrap">
			{#each PRESET_BUY_INS as b}
				<button type="button" class="buyin-btn" class:selected={buyIn === b && buyInStr === String(b)}
					on:click={() => selectPresetBuyIn(b)}>${b}</button>
			{/each}
		</div>
	</div>

	<div class="field-label" style="margin-top:22px">Hours</div>
	<div style="display:flex; align-items:center; gap:12px; margin-top:10px; background:var(--card); border:1.5px solid var(--rule); border-radius:16px; padding:14px 16px">
		<button type="button" class="step-btn" on:click={() => hours = Math.max(0.5, hours - 0.5)}>−</button>
		<div class="pop-display pop-mono" style="flex:1; text-align:center; font-size:28px; color:var(--ink)">{hours}h</div>
		<button type="button" class="step-btn" on:click={() => hours = hours + 0.5}>+</button>
	</div>

	{#if data.groups && data.groups.length > 0}
		<div class="field-label" style="margin-top:22px">Group <span style="font-size:10px; font-weight:600; text-transform:none; letter-spacing:0; color:var(--ink3)">(optional)</span></div>
		<select bind:value={selectedGroup}
			style="width:100%; margin-top:8px; padding:12px 14px; border-radius:14px; border:1.5px solid var(--rule); background:var(--card); font-family:inherit; font-size:14px; font-weight:700; color:var(--ink); outline:none; appearance:none">
			<option value="">No group</option>
			{#each data.groups as g}
				<option value={g.id}>{g.name}</option>
			{/each}
		</select>
	{/if}
</div>

{:else if step === 2}
<div style="padding: 20px 20px 160px">
	<div style="font-size:13px; color:var(--accent); font-weight:800; letter-spacing:1.4px; text-transform:uppercase">Step 2</div>
	<div class="pop-display" style="font-size:36px; margin-top:6px; line-height:1; color:var(--ink)">Who's<br/>seated? 🪑</div>
	<div style="font-size:13px; color:var(--ink2); margin-top:8px">Tap to add. {selectedPlayers.length} selected.</div>

	{#if stepPlayers.length === 0}
		<div style="margin-top:24px; text-align:center; color:var(--ink3)">
			<div style="font-size:14px; font-weight:800; margin-bottom:8px">No players in this group yet</div>
			<a href="/groups" style="color:var(--accent); font-weight:800; text-decoration:none">Add players to the group →</a>
		</div>
	{:else}
		{#if selectedGroup}
			<div style="margin-top:10px; font-size:11px; color:var(--ink3); font-weight:700">
				Showing {data.groups.find(g => String(g.id) === String(selectedGroup))?.name} members
			</div>
		{/if}
		<div style="margin-top:12px; display:grid; grid-template-columns:1fr 1fr; gap:8px">
			{#each stepPlayers as p}
				{@const on = selectedPlayers.includes(p.id)}
				<button type="button" class="player-btn" class:on on:click={() => togglePlayer(p.id)}
					style="background:{on ? 'var(--accent)' : 'var(--card)'}; border-color:{on ? 'var(--ink)' : 'var(--rule)'}; color:{on ? 'white' : 'var(--ink)'}">
					<div class="player-avatar" style="background:{playerColor(p.id, p.color)}">{initials(p.name)}</div>
					<div style="flex:1; text-align:left; font-size:13px; font-weight:800">{p.name.split(' ')[0]}</div>
					{#if on}
						<div style="width:22px; height:22px; border-radius:99px; background:var(--ink); display:flex; align-items:center; justify-content:center; flex-shrink:0">
							<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12l5 5 9-11"/></svg>
						</div>
					{/if}
				</button>
			{/each}
		</div>
	{/if}
</div>

{:else}
<div style="padding: 20px 20px 160px">
	<div style="font-size:13px; color:var(--accent); font-weight:800; letter-spacing:1.4px; text-transform:uppercase">Step 3</div>
	<div class="pop-display" style="font-size:30px; margin-top:6px; line-height:1; color:var(--ink)">Final stacks &<br/>settle-up 💸</div>

	<!-- Balance indicator -->
	<div style="margin-top:16px; padding:12px 14px; background:{balanced ? 'var(--pos-bg)' : 'var(--neg-bg)'}; border:2px solid {balanced ? 'var(--pos)' : 'var(--neg)'}; border-radius:14px; display:flex; align-items:center; gap:10px">
		<div style="width:32px; height:32px; border-radius:99px; background:{balanced ? 'var(--pos)' : 'var(--neg)'}; display:flex; align-items:center; justify-content:center; flex-shrink:0">
			<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="3" stroke-linecap="round" stroke-linejoin="round">
				{#if balanced}<path d="M5 12l5 5 9-11"/>
				{:else}<path d="M13 3L4 14h6l-1 7 9-11h-6z"/>{/if}
			</svg>
		</div>
		<div style="flex:1">
			<div style="font-size:13px; font-weight:800; color:{balanced ? 'var(--pos)' : 'var(--neg)'}">
				{balanced ? 'Table balanced — $0' : `Off by ${fmtDollars(total)}`}
			</div>
			<div style="font-size:11px; color:var(--ink2); margin-top:1px">
				{balanced ? `${settlements.length} payments figured out` : 'Net of all results must equal $0'}
			</div>
		</div>
	</div>

	<!-- Mode toggle -->
	<div style="display:flex; gap:6px; margin-top:14px; background:var(--bg2); border-radius:99px; padding:4px">
		<button type="button" class="mode-btn" class:active={resultMode === 'stack'} on:click={() => resultMode = 'stack'}>Ending stack</button>
		<button type="button" class="mode-btn" class:active={resultMode === 'net'} on:click={() => resultMode = 'net'}>Net profit</button>
	</div>

	<!-- Per-player inputs -->
	<div style="margin-top:12px">
		{#each selectedPlayers as id (id)}
			{@const p = data.players.find(pl => pl.id === id)}
			{@const net = resultMode === 'stack' ? parseCO(id) - buyIn : parseNT(id)}
			<div style="display:flex; align-items:center; gap:8px; padding:10px 12px; background:var(--card); border:1.5px solid var(--rule); border-radius:14px; margin-bottom:8px">
				<div style="width:30px; height:30px; border-radius:99px; background:{playerColor(id)}; display:flex; align-items:center; justify-content:center; font-size:11px; font-weight:800; color:#3A2E1A; flex-shrink:0">{initials(p?.name ?? '')}</div>
				<div style="width:52px; font-size:13px; font-weight:800; color:var(--ink); flex-shrink:0">{p?.name.split(' ')[0]}</div>

				{#if resultMode === 'stack'}
					<button type="button" class="step-btn" on:click={() => adjCO(id, -STEP)}>−</button>
					<div style="flex:1; display:flex; align-items:center; justify-content:center; gap:2px; min-width:0">
						<span style="font-size:14px; font-weight:800; color:var(--ink3)">$</span>
						<input type="text" inputmode="decimal"
							bind:value={cashoutStrs[id]}
							style="width:72px; text-align:center; font-size:18px; font-weight:800; letter-spacing:-0.04em; font-feature-settings:'tnum' 1; color:var(--ink); background:transparent; border:none; outline:none; font-family:inherit"/>
					</div>
					<button type="button" class="step-btn" on:click={() => adjCO(id, STEP)}>+</button>
					<div style="width:46px; text-align:right; font-size:12px; font-weight:800; flex-shrink:0; font-feature-settings:'tnum' 1"
						style:color={net === 0 ? 'var(--ink3)' : net > 0 ? 'var(--pos)' : 'var(--neg)'}>
						{net === 0 ? '±0' : fmtDollars(net)}
					</div>
				{:else}
					<button type="button" class="step-btn" on:click={() => adjNT(id, -STEP)}>−</button>
					<input type="text" inputmode="decimal"
						bind:value={netStrs[id]}
						style="flex:1; text-align:center; font-size:18px; font-weight:800; letter-spacing:-0.04em; font-feature-settings:'tnum' 1; background:transparent; border:none; outline:none; min-width:0; font-family:inherit"
						style:color={net === 0 ? 'var(--ink2)' : net > 0 ? 'var(--pos)' : 'var(--neg)'}/>
					<button type="button" class="step-btn" on:click={() => adjNT(id, STEP)}>+</button>
				{/if}
			</div>
		{/each}
	</div>

	{#if !balanced && selectedPlayers.length > 0}
		<button type="button" class="auto-balance-btn" on:click={autoBalance}>
			Auto-balance · adjust {data.players.find(p => p.id === selectedPlayers[0])?.name.split(' ')[0]} by {fmtDollars(-total)}
		</button>
	{/if}

	{#if balanced && settlements.length > 0}
		<div style="margin-top:22px">
			<div style="font-size:12px; font-weight:800; letter-spacing:1.3px; text-transform:uppercase; color:var(--ink2); margin-bottom:6px">Pay-outs</div>
			<div class="pop-display" style="font-size:18px; margin-bottom:10px; color:var(--ink)">Just <span style="color:var(--accent)">{settlements.length} payment{settlements.length > 1 ? 's' : ''}</span></div>
			{#each settlements as s}
				{@const fromId = data.players.find(p => p.name === s.from_player)?.id ?? 0}
				{@const toId = data.players.find(p => p.name === s.to_player)?.id ?? 0}
				<div style="display:flex; align-items:center; gap:10px; padding:12px 14px; background:var(--card); border:1.5px solid var(--rule); border-radius:14px; margin-bottom:8px">
					<div style="width:30px; height:30px; border-radius:99px; background:{playerColor(fromId)}; display:flex; align-items:center; justify-content:center; font-size:11px; font-weight:800; color:#3A2E1A">{initials(s.from_player)}</div>
					<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--ink3)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h14M13 6l6 6-6 6"/></svg>
					<div style="width:30px; height:30px; border-radius:99px; background:{playerColor(toId)}; display:flex; align-items:center; justify-content:center; font-size:11px; font-weight:800; color:#3A2E1A">{initials(s.to_player)}</div>
					<div style="flex:1; font-size:13px; font-weight:700; color:var(--ink)">{s.from_player.split(' ')[0]} → {s.to_player.split(' ')[0]}</div>
					<div style="font-size:16px; font-weight:800; font-feature-settings:'tnum' 1; color:var(--ink)">${(s.amount / 100).toFixed(0)}</div>
				</div>
			{/each}
		</div>
	{/if}
</div>
{/if}

<!-- CTA -->
<div class="cta-wrap">
	{#if step < 3}
		<button type="button" class="cta-btn"
			on:click={() => { step++; if (step === 3) initStep3(); }}>
			{step === 1 ? 'Pick players →' : `Continue with ${selectedPlayers.length} →`}
		</button>
	{:else}
		<form method="POST">
			<input type="hidden" name="location" value={locationText} />
			<input type="hidden" name="date" value={dateStr} />
			<input type="hidden" name="blinds" value={selectedBlind} />
			<input type="hidden" name="hours" value={hours} />
			<input type="hidden" name="buy_in" value={buyIn} />
			<input type="hidden" name="entries" value={entriesJson} />
			<input type="hidden" name="group_id" value={selectedGroup} />
			<button type="submit" class="cta-btn" disabled={!balanced || selectedPlayers.length === 0}
				style="opacity:{balanced ? 1 : 0.5}; cursor:{balanced ? 'pointer' : 'not-allowed'}">
				{balanced ? 'Save session ✓' : `Off by ${fmtDollars(total)}`}
			</button>
		</form>
	{/if}
</div>

<style>
.back-btn {
	width: 36px; height: 36px; border-radius: 999px;
	background: var(--card); border: 1.5px solid var(--ink);
	display: flex; align-items: center; justify-content: center;
	color: var(--ink); cursor: pointer;
}
.field-label { font-size: 12px; font-weight: 800; letter-spacing: 1.3px; text-transform: uppercase; color: var(--ink2); }
.date-btn {
	flex: 1; padding: 12px; border-radius: 14px; background: var(--card); color: var(--ink);
	border: 1.5px solid var(--rule); font-size: 13px; font-weight: 800; text-align: center; cursor: pointer; font-family: inherit;
}
.date-btn.selected { background: var(--ink); color: var(--bg); border-color: var(--ink); }
.blind-btn {
	background: var(--card); color: var(--ink); border: 1.5px solid var(--rule); border-radius: 14px;
	padding: 10px 14px; cursor: pointer; flex-shrink: 0; font-family: inherit; font-size: 13px; font-weight: 800;
}
.blind-btn.selected { background: var(--ink); color: var(--bg); border-color: var(--ink); }
.buyin-btn {
	padding: 6px 12px; border-radius: 999px; background: var(--bg); color: var(--ink);
	border: none; font-size: 12px; font-weight: 800; cursor: pointer; font-family: inherit;
}
.buyin-btn.selected { background: var(--ink); color: var(--bg); }
.step-btn {
	width: 28px; height: 28px; border-radius: 99px; flex-shrink: 0;
	background: var(--bg2); border: none; display: flex; align-items: center; justify-content: center;
	cursor: pointer; font-weight: 800; font-size: 16px; color: var(--ink); font-family: inherit;
}
.player-btn {
	border-radius: 16px; padding: 12px; cursor: pointer;
	display: flex; align-items: center; gap: 10px; border: 2px solid; font-family: inherit;
}
.player-avatar {
	width: 34px; height: 34px; border-radius: 999px; display: flex; align-items: center;
	justify-content: center; font-size: 12px; font-weight: 800; color: #3A2E1A; flex-shrink: 0;
}
.mode-btn {
	flex: 1; padding: 7px 10px; border-radius: 99px; background: transparent; color: var(--ink2);
	border: none; font-size: 12px; font-weight: 800; cursor: pointer; font-family: inherit; text-align: center;
}
.mode-btn.active { background: var(--ink); color: var(--bg); }
.auto-balance-btn {
	width: 100%; margin-top: 6px; padding: 10px 12px; background: var(--bg2);
	border: 1.5px dashed var(--ink2); border-radius: 12px; font-size: 12px; font-weight: 800;
	color: var(--ink2); text-align: center; cursor: pointer; font-family: inherit;
}
.cta-wrap {
	position: fixed;
	bottom: 100px;
	left: 50%;
	transform: translateX(-50%);
	width: 100%;
	max-width: 430px;
	padding: 0 20px;
	z-index: 10;
}
.cta-btn {
	display: block; width: 100%; background: var(--ink); color: var(--bg);
	padding: 16px 0; border-radius: 999px; text-align: center; font-size: 15px; font-weight: 800;
	box-shadow: 0 3px 0 rgba(0,0,0,0.25); cursor: pointer; border: none; font-family: inherit;
}
</style>
