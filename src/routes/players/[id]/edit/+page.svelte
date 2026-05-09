<script lang="ts">
	import type { PageData, ActionData } from './$types';
	export let data: PageData;
	export let form: ActionData;

	const PRESET_COLORS = [
		'#E8B4A0', '#A8C8E0', '#C9D6A8', '#D4B5D4',
		'#F0C97A', '#B8B0E8', '#FF6E4F', '#2944D8'
	];

	let selectedColor = data.player.color || '';
	let name = data.player.name;
	let bio = data.player.bio || '';
</script>

<svelte:head>
	<title>chiplist · Edit {data.player.name}</title>
</svelte:head>

<div style="padding:56px 20px 0">
	<a href="/players/{data.player.id}" style="display:inline-flex; align-items:center; justify-content:center; width:36px; height:36px; border-radius:999px; background:var(--card); border:1.5px solid var(--ink); color:var(--ink); text-decoration:none">
		<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M15 6l-6 6 6 6"/></svg>
	</a>
</div>

<div style="padding:24px 20px">
	<div style="font-size:13px; color:var(--accent); font-weight:800; letter-spacing:1.4px; text-transform:uppercase">Edit player</div>
	<div class="pop-display" style="font-size:32px; margin-top:6px; line-height:1; color:var(--ink)">{data.player.name}</div>

	{#if form?.error}
		<div style="margin-top:16px; padding:12px 14px; background:var(--neg-bg); border:1.5px solid var(--neg); border-radius:12px; font-size:13px; font-weight:700; color:var(--neg)">
			{form.error}
		</div>
	{/if}

	<form method="POST" style="margin-top:24px">
		<input type="hidden" name="color" bind:value={selectedColor} />

		<div style="margin-bottom:18px">
			<div style="font-size:11px; font-weight:800; letter-spacing:1.3px; text-transform:uppercase; color:var(--ink2); margin-bottom:6px">Name</div>
			<input
				type="text"
				name="name"
				bind:value={name}
				required
				placeholder="Player name"
				style="width:100%; padding:13px 15px; border-radius:14px; border:1.5px solid var(--rule); background:var(--card); font-family:inherit; font-size:14px; font-weight:700; color:var(--ink); outline:none"
			/>
		</div>

		<div style="margin-bottom:18px">
			<div style="font-size:11px; font-weight:800; letter-spacing:1.3px; text-transform:uppercase; color:var(--ink2); margin-bottom:10px">Color</div>
			<div style="display:flex; gap:8px; flex-wrap:wrap">
				<!-- No custom color option -->
				<button type="button" on:click={() => selectedColor = ''}
					style="width:40px; height:40px; border-radius:999px; border:{selectedColor === '' ? '3px solid var(--ink)' : '2px solid var(--rule)'}; background:var(--bg2); display:flex; align-items:center; justify-content:center; cursor:pointer; box-shadow:{selectedColor === '' ? '0 0 0 2px var(--bg)' : 'none'}">
					<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--ink2)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M6 6l12 12M6 18L18 6"/></svg>
				</button>
				{#each PRESET_COLORS as c}
					<button type="button" on:click={() => selectedColor = c}
						style="width:40px; height:40px; border-radius:999px; background:{c}; border:{selectedColor === c ? '3px solid var(--ink)' : '2px solid transparent'}; cursor:pointer; box-shadow:{selectedColor === c ? '0 0 0 2px var(--bg)' : 'none'}">
					</button>
				{/each}
			</div>
			{#if selectedColor}
				<div style="margin-top:8px; font-size:11px; color:var(--ink3); font-weight:700">Selected: <span style="color:var(--ink)">{selectedColor}</span></div>
			{/if}
		</div>

		<div style="margin-bottom:28px">
			<div style="font-size:11px; font-weight:800; letter-spacing:1.3px; text-transform:uppercase; color:var(--ink2); margin-bottom:6px">Bio <span style="font-weight:600; text-transform:none; letter-spacing:0">(optional)</span></div>
			<textarea
				name="bio"
				bind:value={bio}
				placeholder="Loves bluffing on the river…"
				rows="3"
				style="width:100%; padding:13px 15px; border-radius:14px; border:1.5px solid var(--rule); background:var(--card); font-family:inherit; font-size:14px; font-weight:700; color:var(--ink); outline:none; resize:vertical"
			></textarea>
		</div>

		<button type="submit" style="display:block; width:100%; background:var(--ink); color:var(--bg); padding:16px 0; border-radius:999px; text-align:center; font-size:15px; font-weight:800; border:none; cursor:pointer; font-family:inherit; box-shadow:0 3px 0 rgba(0,0,0,0.25)">
			Save changes →
		</button>
	</form>
</div>
