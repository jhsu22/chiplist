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
	status?: string;
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

export interface SettlementRecord {
	id: number;
	session_id: number;
	from_player_id: number;
	to_player_id: number;
	amount: number; // cents
	status: 'pending' | 'sent' | 'resolved';
	created_at: string;
	sent_at: string | null;
	resolved_at: string | null;
}

export interface NotificationRecord {
	id: number;
	user_id: number;
	type: 'session_pending' | 'session_approved' | 'you_owe' | 'payment_sent' | 'payment_confirmed';
	title: string;
	body: string;
	related_id: number | null;
	read: number; // 0 | 1
	created_at: string;
	// Enriched fields (joined):
	settlement_status?: string | null;
	settlement_amount?: number | null;
	from_player_id?: number | null;
	to_player_id?: number | null;
	settlement_from_name?: string | null;
	settlement_to_name?: string | null;
	session_group_id?: number | null;
}
