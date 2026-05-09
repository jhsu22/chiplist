export interface Player {
	id: number;
	name: string;
	created_at: string;
	user_id?: number | null;
	color?: string;
	bio?: string;
}

export interface Session {
	id: number;
	name: string;
	date: string;
	location: string | null;
	blinds: string | null;
	hours: number | null;
	notes: string | null;
	created_at: string;
	group_id?: number | null;
}

export interface SessionEntry {
	id: number;
	session_id: number;
	player_id: number;
	buy_in: number;   // cents
	cash_out: number; // cents
}

export interface SessionEntryWithPlayer extends SessionEntry {
	player_name: string;
}

export interface PlayerStats {
	player: Player;
	sessions_played: number;
	total_buy_in: number;  // cents
	total_cash_out: number; // cents
	net_profit: number;    // cents
	win_rate: number;      // 0–1
	avg_profit_per_session: number; // cents
	biggest_win: number;   // cents
	biggest_loss: number;  // cents
}

export interface Settlement {
	from_player: string;
	to_player: string;
	amount: number; // cents
}

export interface User {
	id: number;
	username: string;
	display_name: string;
	created_at: string;
}

export interface Group {
	id: number;
	name: string;
	description: string;
	invite_code: string;
	owner_id: number | null;
	created_at: string;
}
