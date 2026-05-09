<script lang="ts">
	import type { ActionData } from './$types';
	export let form: ActionData;
</script>

<svelte:head>
	<title>chiplist · New Group</title>
</svelte:head>

<div style="padding:56px 20px 0">
	<a href="/groups" style="display:inline-flex; align-items:center; justify-content:center; width:36px; height:36px; border-radius:999px; background:var(--card); border:1.5px solid var(--ink); color:var(--ink); text-decoration:none">
		<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M15 6l-6 6 6 6"/></svg>
	</a>
</div>

<div style="padding:24px 20px">
	<div style="font-size:13px; color:var(--accent); font-weight:800; letter-spacing:1.4px; text-transform:uppercase">New group</div>
	<div class="pop-display" style="font-size:36px; margin-top:6px; line-height:1; color:var(--ink)">Create your<br/>poker crew</div>

	{#if form?.error}
		<div style="margin-top:16px; padding:12px 14px; background:var(--neg-bg); border:1.5px solid var(--neg); border-radius:12px; font-size:13px; font-weight:700; color:var(--neg)">
			{form.error}
		</div>
	{/if}

	<form method="POST" style="margin-top:28px">
		<div style="margin-bottom:18px">
			<div style="font-size:11px; font-weight:800; letter-spacing:1.3px; text-transform:uppercase; color:var(--ink2); margin-bottom:6px">Group name</div>
			<input
				type="text"
				name="name"
				required
				placeholder="Friday Night Poker"
				style="width:100%; padding:13px 15px; border-radius:14px; border:1.5px solid var(--rule); background:var(--card); font-family:inherit; font-size:14px; font-weight:700; color:var(--ink); outline:none"
			/>
		</div>

		<div style="margin-bottom:28px">
			<div style="font-size:11px; font-weight:800; letter-spacing:1.3px; text-transform:uppercase; color:var(--ink2); margin-bottom:6px">Description <span style="font-weight:600; text-transform:none; letter-spacing:0">(optional)</span></div>
			<textarea
				name="description"
				placeholder="Weekly home game at Alex's place…"
				rows="3"
				style="width:100%; padding:13px 15px; border-radius:14px; border:1.5px solid var(--rule); background:var(--card); font-family:inherit; font-size:14px; font-weight:700; color:var(--ink); outline:none; resize:vertical"
			></textarea>
		</div>

		<button type="submit" style="display:block; width:100%; background:var(--ink); color:var(--bg); padding:16px 0; border-radius:999px; text-align:center; font-size:15px; font-weight:800; border:none; cursor:pointer; font-family:inherit; box-shadow:0 3px 0 rgba(0,0,0,0.25)">
			Create group →
		</button>
	</form>
</div>
