import type { Settlement } from './types';

/** Format cents as a dollar string, e.g. 1050 → "$10.50" */
export function formatMoney(cents: number): string {
	const abs = Math.abs(cents);
	const dollars = abs / 100;
	const str = dollars % 1 === 0 ? `$${dollars}` : `$${dollars.toFixed(2)}`;
	return cents < 0 ? `-${str}` : str;
}

/** Format cents with sign: +$10 or −$10 */
export function formatProfit(cents: number): string {
	if (cents === 0) return '$0';
	const dollars = Math.abs(cents) / 100;
	const str = dollars % 1 === 0 ? `$${dollars}` : `$${dollars.toFixed(2)}`;
	return cents > 0 ? `+${str}` : `−${str}`;
}

/** Format a dollar amount (not cents) with sign: +$240 or −$120 */
export function fmtDollars(dollars: number): string {
	if (dollars === 0) return '$0';
	const abs = Math.abs(dollars);
	const str = abs % 1 === 0 ? `$${abs}` : `$${abs.toFixed(2)}`;
	return dollars > 0 ? `+${str}` : `−${str}`;
}

/** Parse a dollar string like "10.50" or "10" into cents */
export function parseMoney(value: string): number {
	return Math.round(parseFloat(value || '0') * 100);
}

/** CSS class for a profit/loss value */
export function profitClass(cents: number): string {
	if (cents > 0) return 'profit';
	if (cents < 0) return 'loss';
	return 'even';
}

/**
 * Minimize the number of transactions needed to settle debts.
 * Returns a list of {from, to, amount} transfers.
 */
export function calculateSettlements(
	entries: { player: string; net: number }[]
): Settlement[] {
	const creditors = entries
		.filter((e) => e.net > 0)
		.map((e) => ({ ...e }))
		.sort((a, b) => b.net - a.net);
	const debtors = entries
		.filter((e) => e.net < 0)
		.map((e) => ({ ...e }))
		.sort((a, b) => a.net - b.net);

	const settlements: Settlement[] = [];
	let i = 0;
	let j = 0;

	while (i < creditors.length && j < debtors.length) {
		const amount = Math.min(creditors[i].net, -debtors[j].net);
		if (amount > 0) {
			settlements.push({
				from_player: debtors[j].player,
				to_player: creditors[i].player,
				amount
			});
		}
		creditors[i].net -= amount;
		debtors[j].net += amount;
		if (creditors[i].net === 0) i++;
		if (debtors[j].net === 0) j++;
	}

	return settlements;
}

const AVATAR_COLORS = [
	'#E8B4A0', '#A8C8E0', '#C9D6A8', '#D4B5D4',
	'#F0C97A', '#B8B0E8', '#F0A8A8', '#A8D8C8',
];

/** Deterministic avatar color from player id, with optional custom color override */
export function playerColor(id: number, customColor?: string | null): string {
	if (customColor) return customColor;
	return AVATAR_COLORS[id % AVATAR_COLORS.length];
}

/** Two-letter initials from a full name */
export function initials(name: string): string {
	const parts = name.trim().split(/\s+/);
	if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
	return name.slice(0, 2).toUpperCase();
}

/** SVG polyline path for a sparkline */
export function sparkPath(values: number[], w: number, h: number, pad = 6): string {
	if (values.length < 2) return '';
	const min = Math.min(...values);
	const max = Math.max(...values);
	const range = max - min || 1;
	const xs = values.map((_, i) => pad + (i / (values.length - 1)) * (w - pad * 2));
	const ys = values.map((v) => h - pad - ((v - min) / range) * (h - pad * 2));
	return xs.map((x, i) => `${i ? 'L' : 'M'}${x.toFixed(1)} ${ys[i].toFixed(1)}`).join(' ');
}

/** SVG area path (closed at zero baseline) */
export function areaPath(values: number[], w: number, h: number, pad = 6): string {
	if (values.length < 2) return '';
	const min = Math.min(...values, 0);
	const max = Math.max(...values, 0);
	const range = max - min || 1;
	const xs = values.map((_, i) => pad + (i / (values.length - 1)) * (w - pad * 2));
	const ys = values.map((v) => h - pad - ((v - min) / range) * (h - pad * 2));
	const yZero = h - pad - ((0 - min) / range) * (h - pad * 2);
	let d = `M${xs[0]} ${yZero}`;
	xs.forEach((x, i) => { d += ` L${x.toFixed(1)} ${ys[i].toFixed(1)}`; });
	d += ` L${xs[xs.length - 1]} ${yZero} Z`;
	return d;
}
