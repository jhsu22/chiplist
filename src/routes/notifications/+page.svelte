<script lang="ts">
	import type { PageData, ActionData } from './$types';
	import { enhance } from '$app/forms';
	import type { NotificationRecord } from '$lib/types';

	export let data: PageData;
	export let form: ActionData;

	// Split into actionable vs informational
	$: actionable = data.notifications.filter(n => {
		if (n.type === 'session_pending') return true;
		if (n.type === 'you_owe' && n.settlement_status === 'pending') return true;
		if (n.type === 'payment_sent' && n.settlement_status === 'sent') return true;
		return false;
	});

	$: informational = data.notifications.filter(n => !actionable.includes(n));

	function relativeTime(ts: string): string {
		const now = Date.now();
		const then = new Date(ts + 'Z').getTime();
		const diff = Math.floor((now - then) / 1000);
		if (diff < 60) return 'just now';
		if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
		if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
		if (diff < 86400 * 7) return `${Math.floor(diff / 86400)}d ago`;
		return new Date(ts + 'Z').toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
	}

	// Re-render after action
	let submitting = new Set<number>();
	function startSubmit(id: number) { submitting.add(id); submitting = submitting; }
</script>

<svelte:head>
	<title>chiplist · Notifications</title>
</svelte:head>

<!-- Header -->
<div style="padding:20px 20px 0; display:flex; justify-content:space-between; align-items:center">
	<a href="/" style="display:inline-flex; align-items:center; justify-content:center; width:36px; height:36px; border-radius:999px; background:var(--card); border:1.5px solid var(--ink); color:var(--ink); text-decoration:none">
		<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M15 6l-6 6 6 6"/></svg>
	</a>
	<div style="font-size:14px; font-weight:800; color:var(--ink)">Notifications</div>
	<div style="width:36px"></div>
</div>

{#if data.notifications.length === 0}
	<div style="margin:48px 20px; text-align:center">
		<div style="font-size:40px; margin-bottom:12px">🔔</div>
		<div style="font-size:16px; font-weight:800; color:var(--ink)">All caught up</div>
		<div style="font-size:13px; color:var(--ink3); margin-top:4px">No notifications yet</div>
	</div>
{:else}

<!-- ── NEEDS ACTION ── -->
{#if actionable.length > 0}
	<div style="margin:24px 20px 0">
		<div style="font-size:11px; font-weight:800; letter-spacing:1.2px; text-transform:uppercase; color:var(--ink2); margin-bottom:10px">Needs Action</div>
		<div style="display:flex; flex-direction:column; gap:10px">
			{#each actionable as n (n.id)}
				<div style="background:var(--card); border:1.5px solid var(--ink); border-radius:16px; padding:14px 16px; position:relative">
					<!-- Type icon + title -->
					<div style="display:flex; gap:10px; align-items:flex-start">
						<div style="width:36px; height:36px; border-radius:10px; flex-shrink:0; display:flex; align-items:center; justify-content:center; font-size:18px; background:{
							n.type === 'session_pending' ? 'var(--butter)' :
							n.type === 'you_owe' ? 'var(--neg-bg)' :
							'var(--pos-bg)'}">
							{n.type === 'session_pending' ? '📋' : n.type === 'you_owe' ? '💸' : '💰'}
						</div>
						<div style="flex:1; min-width:0">
							<div style="font-size:14px; font-weight:800; color:var(--ink); line-height:1.3">{n.title}</div>
							<div style="font-size:12px; color:var(--ink2); margin-top:2px">{n.body}</div>
							<div style="font-size:11px; color:var(--ink3); margin-top:4px">{relativeTime(n.created_at)}</div>
						</div>
					</div>

					<!-- Action buttons -->
					<div style="margin-top:12px">
						{#if n.type === 'session_pending' && n.session_group_id}
							<a href="/groups/{n.session_group_id}"
								style="display:block; text-align:center; background:var(--accent); color:white; border:2px solid var(--ink); border-radius:12px; padding:10px; font-size:13px; font-weight:800; text-decoration:none; box-shadow:0 2px 0 var(--ink)">
								Review session →
							</a>
						{:else if n.type === 'session_pending'}
							<a href="/groups"
								style="display:block; text-align:center; background:var(--accent); color:white; border:2px solid var(--ink); border-radius:12px; padding:10px; font-size:13px; font-weight:800; text-decoration:none; box-shadow:0 2px 0 var(--ink)">
								Go to groups →
							</a>
						{:else if n.type === 'you_owe' && n.settlement_status === 'pending'}
							<form method="POST" action="?/mark_sent" use:enhance={() => {
								startSubmit(n.id);
								return ({ update }) => { update(); };
							}}>
								<input type="hidden" name="settlement_id" value={n.related_id} />
								<input type="hidden" name="notification_id" value={n.id} />
								<button type="submit" disabled={submitting.has(n.id)}
									style="width:100%; background:var(--neg-bg); color:var(--neg); border:2px solid var(--neg); border-radius:12px; padding:10px; font-size:13px; font-weight:800; cursor:pointer; font-family:inherit; box-shadow:0 2px 0 var(--neg)">
									I sent the money ✓
								</button>
							</form>
						{:else if n.type === 'payment_sent' && n.settlement_status === 'sent'}
							<form method="POST" action="?/confirm_received" use:enhance={() => {
								startSubmit(n.id);
								return ({ update }) => { update(); };
							}}>
								<input type="hidden" name="settlement_id" value={n.related_id} />
								<input type="hidden" name="notification_id" value={n.id} />
								<button type="submit" disabled={submitting.has(n.id)}
									style="width:100%; background:var(--pos-bg); color:var(--pos); border:2px solid var(--pos); border-radius:12px; padding:10px; font-size:13px; font-weight:800; cursor:pointer; font-family:inherit; box-shadow:0 2px 0 var(--pos)">
									Confirm I received it ✓
								</button>
							</form>
						{/if}
					</div>
				</div>
			{/each}
		</div>
	</div>
{/if}

<!-- ── RECENT / HISTORY ── -->
{#if informational.length > 0}
	<div style="margin:24px 20px 0">
		<div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:10px">
			<div style="font-size:11px; font-weight:800; letter-spacing:1.2px; text-transform:uppercase; color:var(--ink2)">
				{actionable.length > 0 ? 'Recent' : 'Notifications'}
			</div>
			<form method="POST" action="?/clear_resolved" use:enhance={() => ({ update }) => update()}>
				<button type="submit" style="font-size:11px; font-weight:800; color:var(--ink3); background:none; border:none; cursor:pointer; font-family:inherit; padding:0">
					Clear
				</button>
			</form>
		</div>
		<div style="display:flex; flex-direction:column; gap:1px; background:var(--rule); border-radius:16px; overflow:hidden; border:1.5px solid var(--ink)">
			{#each informational as n, i (n.id)}
				<div style="background:var(--card); padding:14px 16px; display:flex; gap:10px; align-items:flex-start;
					{i === 0 ? 'border-radius:14px 14px 0 0;' : ''}
					{i === informational.length - 1 ? 'border-radius:0 0 14px 14px;' : ''}">
					<div style="width:32px; height:32px; border-radius:9px; flex-shrink:0; display:flex; align-items:center; justify-content:center; font-size:16px; background:{
						n.type === 'session_approved' ? 'var(--cobalt-soft)' :
						n.type === 'payment_confirmed' ? 'var(--pos-bg)' :
						n.type === 'you_owe' && n.settlement_status === 'resolved' ? 'var(--pos-bg)' :
						n.type === 'you_owe' && n.settlement_status === 'sent' ? 'var(--butter)' :
						'var(--bg2)'}">
						{n.type === 'session_approved' ? '🃏' :
						 n.type === 'payment_confirmed' ? '✅' :
						 n.type === 'you_owe' && n.settlement_status === 'resolved' ? '✅' :
						 n.type === 'you_owe' && n.settlement_status === 'sent' ? '⏳' :
						 '🔔'}
					</div>
					<div style="flex:1; min-width:0">
						<div style="font-size:13px; font-weight:800; color:var(--ink); line-height:1.3">
							{n.title}
							{#if n.type === 'you_owe' && n.settlement_status === 'sent'}
								<span style="font-size:11px; font-weight:600; color:var(--ink3)"> · waiting for confirmation</span>
							{:else if n.type === 'you_owe' && n.settlement_status === 'resolved'}
								<span style="font-size:11px; font-weight:600; color:var(--pos)"> · settled</span>
							{/if}
						</div>
						<div style="font-size:12px; color:var(--ink2); margin-top:1px">{n.body}</div>
						<div style="display:flex; justify-content:space-between; align-items:center; margin-top:4px">
							<div style="font-size:11px; color:var(--ink3)">{relativeTime(n.created_at)}</div>
							{#if n.type === 'session_approved' && n.related_id}
								<a href="/sessions/{n.related_id}" style="font-size:11px; font-weight:800; color:var(--cobalt); text-decoration:none">View →</a>
							{/if}
						</div>
					</div>
				</div>
			{/each}
		</div>
	</div>
{/if}

{/if}

<div style="height:24px"></div>
