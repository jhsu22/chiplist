<script lang="ts">
	import type { PageData } from './$types';
	import { formatProfit, formatMoney, profitClass, playerColor, initials, sparkPath, areaPath } from '$lib/utils';

	export let data: PageData;

	let range: '1M' | '3M' | 'All' = 'All';
	const RANGES: Array<'1M' | '3M' | 'All'> = ['1M', '3M', 'All'];
	function setRange(r: '1M' | '3M' | 'All') { range = r; }

	$: chartValues = (() => {
		const full = data.chart_data.map(d => d.value / 100); // cents to dollars
		if (range === '1M') return full.slice(-4);
		if (range === '3M') return full.slice(-8);
		return full;
	})();

	const W = 332, H = 130;
	$: linePath = sparkPath(chartValues, W, H);
	$: fillPath = areaPath(chartValues, W, H);
	$: lastVal = chartValues[chartValues.length - 1] ?? 0;
	$: chartColor = lastVal >= 0 ? 'var(--pos)' : 'var(--neg)';

	$: netProfit = data.stats.net_profit;
	$: totalHours = data.entries.reduce((s: number, e: any) => {
		// hours not available per entry, just count sessions
		return s;
	}, 0);
</script>

<svelte:head>
	<title>chiplist · {data.player.name}</title>
</svelte:head>

<!-- Header -->
<div style="padding:20px 20px 0; display:flex; justify-content:space-between; align-items:center">
	<a href="/players" class="back-btn">
		<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M15 6l-6 6 6 6"/></svg>
	</a>
	<div style="font-size:14px; font-weight:800; letter-spacing:-0.3px; color:var(--ink)">Player</div>
	<div style="width:36px; height:36px; border-radius:999px; background:var(--card); border:1.5px solid var(--ink); display:flex; align-items:center; justify-content:center; font-size:14px; color:var(--ink2)">···</div>
</div>

<!-- Hero card -->
<div style="margin:20px 20px 0; border-radius:24px; padding:22px; background:var(--coral-soft); border:2.5px solid var(--ink)">
	<div style="display:flex; align-items:center; gap:14px">
		<div style="width:64px; height:64px; border-radius:999px; background:{playerColor(data.player.id)}; border:2.5px solid var(--ink); display:flex; align-items:center; justify-content:center; font-size:22px; font-weight:800; color:#3A2E1A">
			{initials(data.player.name)}
		</div>
		<div>
			<div style="font-size:22px; font-weight:800; letter-spacing:-0.5px; color:var(--ink)">{data.player.name}</div>
			<div style="font-size:12px; color:var(--ink2); margin-top:2px; font-weight:700">{data.stats.sessions_played} sessions</div>
		</div>
	</div>
	<div style="margin-top:18px">
		<div style="font-size:12px; color:var(--ink2); font-weight:800; letter-spacing:1.3px; text-transform:uppercase">Bankroll</div>
		<div class="pop-display pop-mono" style="font-size:56px; color:{netProfit >= 0 ? 'var(--pos)' : 'var(--neg)'}; line-height:1; margin-top:6px">
			{formatProfit(netProfit)}
		</div>
		<div style="margin-top:10px; display:flex; gap:8px; flex-wrap:wrap">
			<div style="background:var(--pos-bg); color:var(--pos); padding:6px 12px; border-radius:999px; font-size:12px; font-weight:800">{formatProfit(data.stats.avg_profit)}/sess</div>
			<div style="background:var(--card); color:var(--ink); padding:6px 12px; border-radius:999px; font-size:12px; font-weight:800">{Math.round(data.stats.win_rate * 100)}% win</div>
		</div>
	</div>
</div>

<!-- Trend chart -->
{#if chartValues.length >= 2}
<div style="margin:14px 20px 0; border-radius:20px; padding:14px; background:var(--card); border:1.5px solid var(--rule)">
	<div style="display:flex; justify-content:space-between; padding:0 4px 8px; align-items:center">
		<div style="font-size:12px; font-weight:800; letter-spacing:1.2px; text-transform:uppercase; color:var(--ink2)">Trend</div>
		<div style="display:flex; gap:4px">
			{#each RANGES as r}
				<button type="button" on:click={() => setRange(r)}
					style="padding:4px 10px; border-radius:99px; font-size:11px; font-weight:800; background:{range === r ? 'var(--ink)' : 'transparent'}; color:{range === r ? 'var(--bg)' : 'var(--ink2)'}; cursor:pointer; border:none; font-family:inherit">
					{r}
				</button>
			{/each}
		</div>
	</div>
	<svg width={W} height={H} style="display:block; width:100%; height:auto" viewBox="0 0 {W} {H}">
		<defs>
			<linearGradient id="pg" x1="0" x2="0" y1="0" y2="1">
				<stop offset="0%" stop-color={lastVal >= 0 ? '#1F8A4C' : '#E0463A'} stop-opacity="0.25"/>
				<stop offset="100%" stop-color={lastVal >= 0 ? '#1F8A4C' : '#E0463A'} stop-opacity="0"/>
			</linearGradient>
		</defs>
		{#if fillPath}<path d={fillPath} fill="url(#pg)"/>{/if}
		{#if linePath}<path d={linePath} fill="none" stroke={chartColor} stroke-width="2.5" stroke-linejoin="round"/>{/if}
	</svg>
</div>
{/if}

<!-- Stat chips grid -->
<div style="padding:20px 20px 0">
	<div style="font-size:12px; font-weight:800; letter-spacing:1.4px; text-transform:uppercase; color:var(--ink2); margin-bottom:12px">Lifetime</div>
	<div style="display:grid; grid-template-columns:1fr 1fr; gap:10px">
		{#each [
			['Total', formatProfit(netProfit), netProfit >= 0 ? 'var(--pos)' : 'var(--neg)', netProfit >= 0 ? 'var(--pos-bg)' : 'var(--neg-bg)'],
			['Avg/sess', formatProfit(data.stats.avg_profit), data.stats.avg_profit >= 0 ? 'var(--pos)' : 'var(--neg)', 'var(--cobalt-soft)'],
			['Best', formatProfit(data.stats.biggest_win), 'var(--pos)', 'var(--pos-bg)'],
			['Worst', formatProfit(data.stats.biggest_loss), 'var(--neg)', 'var(--neg-bg)'],
			['Sessions', String(data.stats.sessions_played), 'var(--ink)', 'var(--bg2)'],
			['Win rate', `${Math.round(data.stats.win_rate * 100)}%`, 'var(--ink)', 'var(--coral-soft)'],
		] as [label, val, color, bg]}
			<div style="background:{bg}; border-radius:16px; padding:12px 14px; border:1.5px solid var(--rule)">
				<div style="font-size:11px; font-weight:800; letter-spacing:1.1px; text-transform:uppercase; color:var(--ink2)">{label}</div>
				<div class="pop-display pop-mono" style="font-size:22px; color:{color}; margin-top:4px">{val}</div>
			</div>
		{/each}
	</div>
</div>

<!-- Session history -->
<div style="padding:24px 20px 0">
	<div style="font-size:12px; font-weight:800; letter-spacing:1.4px; text-transform:uppercase; color:var(--ink2); margin-bottom:12px">Session history</div>
	{#if data.entries.length === 0}
		<div style="color:var(--ink3); font-size:13px">No sessions played yet.</div>
	{:else}
		<div style="background:var(--card); border:1.5px solid var(--rule); border-radius:16px; overflow:hidden">
			{#each data.entries as e, i}
				{@const profit = e.cash_out - e.buy_in}
				<a href="/sessions/{e.session_id}"
					style="display:flex; align-items:center; padding:12px 14px; border-bottom:{i < data.entries.length - 1 ? '1px solid var(--rule)' : 'none'}; text-decoration:none; color:inherit">
					<div style="flex:1">
						<div style="font-size:14px; font-weight:800; color:var(--ink)">{e.session_name}</div>
						<div style="font-size:11px; color:var(--ink2); margin-top:1px">{e.session_date}</div>
					</div>
					<div class="pop-mono" style="font-size:15px; font-weight:800; color:{profit >= 0 ? 'var(--pos)' : 'var(--neg)'}">
						{formatProfit(profit)}
					</div>
				</a>
			{/each}
		</div>
	{/if}
</div>

<style>
.back-btn {
	width: 36px; height: 36px; border-radius: 999px;
	background: var(--card); border: 1.5px solid var(--ink);
	display: flex; align-items: center; justify-content: center;
	color: var(--ink); text-decoration: none;
}
</style>
