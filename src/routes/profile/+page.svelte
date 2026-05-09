<script lang="ts">
	import type { PageData, ActionData } from './$types';
	import { initials, playerColor } from '$lib/utils';
	import { enhance } from '$app/forms';

	export let data: PageData;
	export let form: ActionData;

	$: user = data.user!;
</script>

<svelte:head>
	<title>chiplist · Profile</title>
</svelte:head>

<!-- Header -->
<div style="padding:56px 20px 0; display:flex; justify-content:space-between; align-items:center">
	<a href="/" style="display:inline-flex; align-items:center; justify-content:center; width:36px; height:36px; border-radius:999px; background:var(--card); border:1.5px solid var(--ink); color:var(--ink); text-decoration:none">
		<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M15 6l-6 6 6 6"/></svg>
	</a>
	<div style="font-size:14px; font-weight:800; color:var(--ink)">Profile</div>
	<form method="POST" action="/logout" use:enhance>
		<button type="submit" style="background:none; border:none; color:var(--ink3); font-size:13px; font-weight:800; cursor:pointer; font-family:inherit; padding:0">
			Log out
		</button>
	</form>
</div>

<!-- Avatar + name card -->
<div style="margin:20px 20px 0; border-radius:24px; padding:22px; background:var(--coral-soft); border:2.5px solid var(--ink)">
	<div style="display:flex; align-items:center; gap:14px">
		<div style="width:64px; height:64px; border-radius:999px; background:{data.linkedPlayer ? playerColor(data.linkedPlayer.id, data.linkedPlayer.color) : 'var(--accent)'}; border:2.5px solid var(--ink); display:flex; align-items:center; justify-content:center; font-size:22px; font-weight:800; color:white; flex-shrink:0">
			{initials(user.display_name || user.username)}
		</div>
		<div>
			<div style="font-size:22px; font-weight:800; letter-spacing:-0.5px; color:var(--ink)">{user.display_name || user.username}</div>
			<div style="font-size:12px; color:var(--ink2); margin-top:2px; font-weight:700">{user.username}</div>
			{#if data.linkedPlayer}
				<a href="/players/{data.linkedPlayer.id}" style="font-size:11px; color:var(--accent); font-weight:800; text-decoration:none; margin-top:3px; display:inline-block">
					View stats →
				</a>
			{/if}
		</div>
	</div>
</div>

<!-- Update display name -->
<div style="margin:16px 20px 0; background:var(--card); border:1.5px solid var(--rule); border-radius:20px; padding:18px">
	<div style="font-size:12px; font-weight:800; letter-spacing:1.3px; text-transform:uppercase; color:var(--ink2); margin-bottom:12px">Display name</div>

	{#if form?.update_success}
		<div style="margin-bottom:10px; padding:10px 12px; background:var(--pos-bg); border:1.5px solid var(--pos); border-radius:10px; font-size:13px; font-weight:700; color:var(--pos)">Saved!</div>
	{/if}
	{#if form?.update_error}
		<div style="margin-bottom:10px; padding:10px 12px; background:var(--neg-bg); border:1.5px solid var(--neg); border-radius:10px; font-size:13px; font-weight:700; color:var(--neg)">{form.update_error}</div>
	{/if}

	<form method="POST" action="?/update_profile" use:enhance style="display:flex; gap:8px">
		<input type="text" name="display_name" value={user.display_name} placeholder="Your name"
			style="flex:1; padding:11px 13px; border-radius:12px; border:1.5px solid var(--rule); background:var(--bg); font-family:inherit; font-size:14px; font-weight:700; color:var(--ink); outline:none"/>
		<button type="submit"
			style="padding:11px 16px; background:var(--ink); color:var(--bg); border-radius:12px; border:none; font-size:13px; font-weight:800; cursor:pointer; font-family:inherit">
			Save
		</button>
	</form>
</div>

<!-- Groups -->
<div style="margin:12px 20px 0; background:var(--card); border:1.5px solid var(--rule); border-radius:20px; padding:18px">
	<div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:12px">
		<div style="font-size:12px; font-weight:800; letter-spacing:1.3px; text-transform:uppercase; color:var(--ink2)">My groups</div>
		<a href="/groups" style="font-size:12px; color:var(--accent); font-weight:800; text-decoration:none">Manage →</a>
	</div>

	{#if form?.join_error}
		<div style="margin-bottom:10px; padding:10px 12px; background:var(--neg-bg); border:1.5px solid var(--neg); border-radius:10px; font-size:13px; font-weight:700; color:var(--neg)">{form.join_error}</div>
	{/if}
	{#if form?.join_success}
		<div style="margin-bottom:10px; padding:10px 12px; background:var(--pos-bg); border:1.5px solid var(--pos); border-radius:10px; font-size:13px; font-weight:700; color:var(--pos)">Joined group!</div>
	{/if}

	{#if data.groups.length === 0}
		<div style="font-size:13px; color:var(--ink3); margin-bottom:14px">No groups yet.</div>
	{:else}
		{#each data.groups as g}
			<a href="/groups/{g.id}" style="display:flex; align-items:center; padding:10px 12px; background:var(--bg); border-radius:12px; margin-bottom:6px; text-decoration:none; color:inherit; border:1.5px solid var(--rule)">
				<div style="flex:1">
					<div style="font-size:14px; font-weight:800; color:var(--ink)">{g.name}</div>
					<div style="font-size:11px; color:var(--ink3); margin-top:1px; font-family:monospace">{g.invite_code}</div>
				</div>
				<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--ink3)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 18l6-6-6-6"/></svg>
			</a>
		{/each}
	{/if}

	<form method="POST" action="?/join_group" use:enhance style="display:flex; gap:8px; margin-top:8px">
		<input type="text" name="invite_code" placeholder="Join with invite code"
			style="flex:1; padding:11px 13px; border-radius:12px; border:1.5px solid var(--rule); background:var(--bg); font-family:inherit; font-size:13px; font-weight:700; color:var(--ink); outline:none; text-transform:uppercase"/>
		<button type="submit"
			style="padding:11px 16px; background:var(--cobalt); color:white; border-radius:12px; border:none; font-size:13px; font-weight:800; cursor:pointer; font-family:inherit">
			Join
		</button>
	</form>
</div>

<div style="height:32px"></div>
