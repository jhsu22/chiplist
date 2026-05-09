<script lang="ts">
	import type { PageData, ActionData } from './$types';
	import { enhance } from '$app/forms';
	export let data: PageData;
	export let form: ActionData;

	let showJoin = false;
</script>

<svelte:head>
	<title>chiplist · Groups</title>
</svelte:head>

<div style="padding:20px 20px 0; display:flex; justify-content:space-between; align-items:center">
	<a href="/" style="display:inline-flex; align-items:center; justify-content:center; width:36px; height:36px; border-radius:999px; background:var(--card); border:1.5px solid var(--ink); color:var(--ink); text-decoration:none">
		<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M15 6l-6 6 6 6"/></svg>
	</a>
	<div style="font-size:14px; font-weight:800; color:var(--ink)">Groups</div>
	<div style="width:36px"></div>
</div>

<div style="padding:24px 20px 0">
	{#if !data.user}
		<div style="text-align:center; padding:40px 0">
			<div style="font-size:48px; margin-bottom:12px">🃏</div>
			<div style="font-size:20px; font-weight:800; color:var(--ink); margin-bottom:8px">Groups are for members</div>
			<div style="font-size:14px; color:var(--ink2); margin-bottom:20px">Log in to create and join poker groups.</div>
			<a href="/login" style="display:inline-block; background:var(--ink); color:var(--bg); padding:12px 24px; border-radius:999px; font-size:14px; font-weight:800; text-decoration:none">
				Log in →
			</a>
		</div>
	{:else}
		<div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:16px">
			<div class="pop-display" style="font-size:28px; color:var(--ink)">Your groups</div>
			<div style="display:flex; gap:8px">
				<button type="button" on:click={() => showJoin = !showJoin}
					style="background:{showJoin ? 'var(--cobalt-soft)' : 'var(--bg2)'}; color:{showJoin ? 'var(--cobalt)' : 'var(--ink2)'}; padding:8px 14px; border-radius:999px; font-size:13px; font-weight:800; text-decoration:none; border:2px solid {showJoin ? 'var(--cobalt)' : 'var(--rule)'}; cursor:pointer; font-family:inherit">
					Join
				</button>
				<a href="/groups/new" style="background:var(--accent); color:white; padding:8px 16px; border-radius:999px; font-size:13px; font-weight:800; text-decoration:none; border:2px solid var(--ink); box-shadow:0 2px 0 var(--ink)">
					+ New
				</a>
			</div>
		</div>

		{#if showJoin}
			<form method="POST" action="?/join_group" use:enhance={() => async ({ result, update }) => {
				await update();
				if (result.type === 'success') showJoin = false;
			}} style="margin-bottom:16px">
				{#if form?.join_error}
					<div style="font-size:12px; color:var(--neg); font-weight:700; margin-bottom:6px">{form.join_error}</div>
				{/if}
				{#if form?.join_success}
					<div style="font-size:12px; color:var(--pos); font-weight:700; margin-bottom:6px">Joined!</div>
				{/if}
				<div style="display:flex; gap:8px">
					<input type="text" name="invite_code" placeholder="Invite code (e.g. ABC12345)" required maxlength="8"
						style="flex:1; padding:11px 13px; border-radius:12px; border:1.5px solid var(--cobalt); background:var(--card); font-family:monospace; font-size:14px; font-weight:700; color:var(--ink); outline:none; text-transform:uppercase"/>
					<button type="submit"
						style="padding:11px 16px; background:var(--cobalt); color:white; border-radius:12px; border:none; font-size:13px; font-weight:800; cursor:pointer; font-family:inherit">
						Join
					</button>
				</div>
			</form>
		{/if}

		{#if data.groups.length === 0}
			<div style="text-align:center; padding:30px 0">
				<div style="font-size:13px; color:var(--ink3); margin-bottom:16px">You're not in any groups yet.</div>
				<a href="/groups/new" style="color:var(--accent); font-weight:800; text-decoration:none; font-size:14px">Create a group →</a>
				<span style="color:var(--ink3); font-size:13px; margin:0 8px">or use a join code above</span>
			</div>
		{:else}
			{#each data.groups as g}
				<a href="/groups/{g.id}" style="display:block; background:var(--card); border:1.5px solid var(--rule); border-radius:18px; padding:16px; margin-bottom:10px; text-decoration:none; color:inherit">
					<div style="display:flex; justify-content:space-between; align-items:flex-start">
						<div style="flex:1">
							<div style="font-size:17px; font-weight:800; color:var(--ink)">{g.name}</div>
							{#if g.description}
								<div style="font-size:13px; color:var(--ink2); margin-top:3px">{g.description}</div>
							{/if}
						</div>
						<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--ink3)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="flex-shrink:0; margin-top:2px"><path d="M9 18l6-6-6-6"/></svg>
					</div>
					<div style="display:flex; gap:8px; margin-top:10px; flex-wrap:wrap">
						<span style="background:var(--bg2); color:var(--ink2); padding:4px 10px; border-radius:999px; font-size:11px; font-weight:800">{g.member_count} member{g.member_count !== 1 ? 's' : ''}</span>
						<span style="background:var(--cobalt-soft); color:var(--cobalt); padding:4px 10px; border-radius:999px; font-size:11px; font-weight:800; font-family:monospace">{g.invite_code}</span>
					</div>
				</a>
			{/each}
		{/if}
	{/if}
</div>
