import type { D1Database } from '@cloudflare/workers-types';
import type { Player, Session, SessionEntry, SessionEntryWithPlayer, User, Group, NotificationRecord, SettlementRecord } from './types';

// ── Players ──────────────────────────────────────────────────────────────────

export async function getPlayers(db: D1Database): Promise<Player[]> {
	const result = await db.prepare('SELECT * FROM players ORDER BY name').all<Player>();
	return result.results;
}

export async function getPlayer(db: D1Database, id: number): Promise<Player | null> {
	return db.prepare('SELECT * FROM players WHERE id = ?').bind(id).first<Player>();
}

export async function createPlayer(db: D1Database, name: string): Promise<number> {
	const result = await db
		.prepare('INSERT INTO players (name) VALUES (?) RETURNING id')
		.bind(name.trim())
		.first<{ id: number }>();
	return result!.id;
}

export async function updatePlayer(
	db: D1Database,
	id: number,
	data: { name: string; color: string; bio: string; user_id?: number | null }
): Promise<void> {
	await db
		.prepare('UPDATE players SET name=?, color=?, bio=?, user_id=? WHERE id=?')
		.bind(data.name, data.color, data.bio, data.user_id ?? null, id)
		.run();
}

export async function getPlayerByUserId(db: D1Database, user_id: number): Promise<Player | null> {
	return db.prepare('SELECT * FROM players WHERE user_id = ?').bind(user_id).first<Player>();
}

export async function deletePlayer(db: D1Database, id: number): Promise<void> {
	await db.prepare('DELETE FROM players WHERE id = ?').bind(id).run();
}

// ── Sessions ─────────────────────────────────────────────────────────────────

export async function getSessions(db: D1Database): Promise<Session[]> {
	const result = await db
		.prepare('SELECT * FROM sessions ORDER BY date DESC, id DESC')
		.all<Session>();
	return result.results;
}

export async function getSession(db: D1Database, id: number): Promise<Session | null> {
	return db.prepare('SELECT * FROM sessions WHERE id = ?').bind(id).first<Session>();
}

export async function createSession(
	db: D1Database,
	data: Pick<Session, 'name' | 'date' | 'location' | 'blinds' | 'hours' | 'notes'> & { group_id?: number | null; status?: string }
): Promise<number> {
	const result = await db
		.prepare(
			'INSERT INTO sessions (name, date, location, blinds, hours, notes, group_id, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?) RETURNING id'
		)
		.bind(data.name, data.date, data.location, data.blinds ?? '', data.hours ?? 0, data.notes, data.group_id ?? null, data.status ?? 'approved')
		.first<{ id: number }>();
	return result!.id;
}

export async function updateSession(
	db: D1Database,
	id: number,
	data: Pick<Session, 'name' | 'date' | 'location' | 'blinds' | 'hours' | 'notes'>
): Promise<void> {
	await db
		.prepare(
			'UPDATE sessions SET name=?, date=?, location=?, blinds=?, hours=?, notes=? WHERE id=?'
		)
		.bind(data.name, data.date, data.location, data.blinds ?? '', data.hours ?? 0, data.notes, id)
		.run();
}

export async function deleteSession(db: D1Database, id: number): Promise<void> {
	await db.prepare('DELETE FROM sessions WHERE id = ?').bind(id).run();
}

// ── Session Entries ───────────────────────────────────────────────────────────

export async function getSessionEntries(
	db: D1Database,
	session_id: number
): Promise<SessionEntryWithPlayer[]> {
	const result = await db
		.prepare(
			`SELECT se.*, p.name as player_name
       FROM session_entries se
       JOIN players p ON p.id = se.player_id
       WHERE se.session_id = ?
       ORDER BY (se.cash_out - se.buy_in) DESC`
		)
		.bind(session_id)
		.all<SessionEntryWithPlayer>();
	return result.results;
}

export async function upsertEntry(
	db: D1Database,
	session_id: number,
	player_id: number,
	buy_in: number,
	cash_out: number
): Promise<void> {
	await db
		.prepare(
			`INSERT INTO session_entries (session_id, player_id, buy_in, cash_out)
       VALUES (?, ?, ?, ?)
       ON CONFLICT(session_id, player_id) DO UPDATE SET buy_in = excluded.buy_in, cash_out = excluded.cash_out`
		)
		.bind(session_id, player_id, buy_in, cash_out)
		.run();
}

export async function removeEntry(
	db: D1Database,
	session_id: number,
	player_id: number
): Promise<void> {
	await db
		.prepare('DELETE FROM session_entries WHERE session_id = ? AND player_id = ?')
		.bind(session_id, player_id)
		.run();
}

export async function getPlayerEntries(
	db: D1Database,
	player_id: number
): Promise<(SessionEntry & { session_name: string; session_date: string })[]> {
	const result = await db
		.prepare(
			`SELECT se.*, s.name as session_name, s.date as session_date
       FROM session_entries se
       JOIN sessions s ON s.id = se.session_id
       WHERE se.player_id = ?
       ORDER BY s.date DESC`
		)
		.bind(player_id)
		.all<SessionEntry & { session_name: string; session_date: string }>();
	return result.results;
}

// ── Auth ──────────────────────────────────────────────────────────────────────

export async function createUser(
	db: D1Database,
	username: string,
	password_hash: string,
	display_name: string
): Promise<number> {
	const result = await db
		.prepare('INSERT INTO users (username, password_hash, display_name) VALUES (?, ?, ?) RETURNING id')
		.bind(username.trim(), password_hash, display_name)
		.first<{ id: number }>();
	return result!.id;
}

export async function getUserByUsername(db: D1Database, username: string): Promise<User | null> {
	return db
		.prepare('SELECT id, username, display_name, created_at FROM users WHERE username = ?')
		.bind(username.trim())
		.first<User>();
}

export async function getUserById(db: D1Database, id: number): Promise<User | null> {
	return db
		.prepare('SELECT id, username, display_name, created_at FROM users WHERE id = ?')
		.bind(id)
		.first<User>();
}

export async function getUserFromSession(
	db: D1Database,
	token: string
): Promise<{ id: number; username: string; display_name: string } | null> {
	return db
		.prepare(
			`SELECT u.id, u.username, u.display_name
       FROM auth_sessions s
       JOIN users u ON u.id = s.user_id
       WHERE s.token = ? AND s.expires_at > datetime('now')`
		)
		.bind(token)
		.first<{ id: number; username: string; display_name: string }>();
}

export async function createAuthSession(
	db: D1Database,
	token: string,
	user_id: number,
	expires_at: string
): Promise<void> {
	await db
		.prepare('INSERT INTO auth_sessions (token, user_id, expires_at) VALUES (?, ?, ?)')
		.bind(token, user_id, expires_at)
		.run();
}

export async function deleteAuthSession(db: D1Database, token: string): Promise<void> {
	await db.prepare('DELETE FROM auth_sessions WHERE token = ?').bind(token).run();
}

// ── Groups ────────────────────────────────────────────────────────────────────

export async function createGroup(
	db: D1Database,
	name: string,
	description: string,
	invite_code: string,
	owner_id: number
): Promise<number> {
	const result = await db
		.prepare(
			'INSERT INTO groups (name, description, invite_code, owner_id) VALUES (?, ?, ?, ?) RETURNING id'
		)
		.bind(name, description, invite_code, owner_id)
		.first<{ id: number }>();
	return result!.id;
}

export async function getGroupById(db: D1Database, id: number): Promise<Group | null> {
	return db.prepare('SELECT * FROM groups WHERE id = ?').bind(id).first<Group>();
}

export async function getGroupByInviteCode(db: D1Database, code: string): Promise<Group | null> {
	return db.prepare('SELECT * FROM groups WHERE invite_code = ?').bind(code).first<Group>();
}

export async function getUserGroups(db: D1Database, user_id: number): Promise<Group[]> {
	// Groups where the user's linked player is a member
	const result = await db
		.prepare(
			`SELECT DISTINCT g.*
       FROM groups g
       JOIN group_members gm ON gm.group_id = g.id
       JOIN players p ON p.id = gm.player_id
       WHERE p.user_id = ?
       ORDER BY g.created_at DESC`
		)
		.bind(user_id)
		.all<Group>();
	return result.results;
}

export async function getGroupMembers(
	db: D1Database,
	group_id: number
): Promise<{ player_id: number; player_name: string; net_profit: number; sessions: number; win_rate: number }[]> {
	const result = await db
		.prepare(
			`SELECT
         p.id as player_id,
         p.name as player_name,
         COALESCE(SUM(se.cash_out - se.buy_in), 0) as net_profit,
         COUNT(se.id) as sessions,
         CASE WHEN COUNT(se.id) = 0 THEN 0
              ELSE CAST(SUM(CASE WHEN se.cash_out > se.buy_in THEN 1 ELSE 0 END) AS REAL) / COUNT(se.id)
         END as win_rate
       FROM group_members gm
       JOIN players p ON p.id = gm.player_id
       LEFT JOIN session_entries se ON se.player_id = p.id
         AND se.session_id IN (
           SELECT id FROM sessions
           WHERE group_id = ? AND (status = 'approved' OR status IS NULL)
         )
       WHERE gm.group_id = ?
       GROUP BY p.id, p.name
       ORDER BY net_profit DESC`
		)
		.bind(group_id, group_id)
		.all<{ player_id: number; player_name: string; net_profit: number; sessions: number; win_rate: number }>();
	return result.results;
}

export async function addGroupMember(
	db: D1Database,
	group_id: number,
	player_id: number
): Promise<void> {
	await db
		.prepare(
			'INSERT OR IGNORE INTO group_members (group_id, player_id) VALUES (?, ?)'
		)
		.bind(group_id, player_id)
		.run();
}

export async function getGroupSessions(db: D1Database, group_id: number): Promise<Session[]> {
	const result = await db
		.prepare("SELECT * FROM sessions WHERE group_id = ? AND (status = 'approved' OR status IS NULL) ORDER BY date DESC")
		.bind(group_id)
		.all<Session>();
	return result.results;
}

export async function getPendingGroupSessions(db: D1Database, group_id: number): Promise<Session[]> {
	const result = await db
		.prepare("SELECT * FROM sessions WHERE group_id = ? AND status = 'pending' ORDER BY date DESC")
		.bind(group_id)
		.all<Session>();
	return result.results;
}

export async function approveSession(db: D1Database, id: number): Promise<void> {
	await db.prepare("UPDATE sessions SET status = 'approved' WHERE id = ?").bind(id).run();
}

export async function updateUserDisplayName(
	db: D1Database,
	user_id: number,
	display_name: string
): Promise<void> {
	await db
		.prepare('UPDATE users SET display_name = ? WHERE id = ?')
		.bind(display_name, user_id)
		.run();
}

// ── Settlements ───────────────────────────────────────────────────────────────

export async function createSettlement(
	db: D1Database,
	session_id: number,
	from_player_id: number,
	to_player_id: number,
	amount: number
): Promise<number> {
	const result = await db
		.prepare(
			'INSERT INTO settlements (session_id, from_player_id, to_player_id, amount) VALUES (?, ?, ?, ?) RETURNING id'
		)
		.bind(session_id, from_player_id, to_player_id, amount)
		.first<{ id: number }>();
	return result!.id;
}

export async function getSettlement(db: D1Database, id: number): Promise<SettlementRecord | null> {
	return db
		.prepare('SELECT * FROM settlements WHERE id = ?')
		.bind(id)
		.first<SettlementRecord>();
}

export async function getSessionSettlements(db: D1Database, session_id: number): Promise<SettlementRecord[]> {
	const result = await db
		.prepare('SELECT * FROM settlements WHERE session_id = ?')
		.bind(session_id)
		.all<SettlementRecord>();
	return result.results;
}

export async function updateSettlementStatus(
	db: D1Database,
	id: number,
	status: 'sent' | 'resolved'
): Promise<void> {
	const field = status === 'sent' ? 'sent_at' : 'resolved_at';
	await db
		.prepare(`UPDATE settlements SET status = ?, ${field} = datetime('now') WHERE id = ?`)
		.bind(status, id)
		.run();
}

// ── Notifications ─────────────────────────────────────────────────────────────

export async function createNotification(
	db: D1Database,
	user_id: number,
	type: string,
	title: string,
	body: string,
	related_id?: number | null
): Promise<void> {
	await db
		.prepare(
			'INSERT INTO notifications (user_id, type, title, body, related_id) VALUES (?, ?, ?, ?, ?)'
		)
		.bind(user_id, type, title, body, related_id ?? null)
		.run();
}

export async function getEnrichedNotifications(
	db: D1Database,
	user_id: number
): Promise<NotificationRecord[]> {
	const result = await db
		.prepare(
			`SELECT
         n.id, n.type, n.title, n.body, n.related_id, n.read, n.created_at,
         s.status  AS settlement_status,
         s.amount  AS settlement_amount,
         s.from_player_id,
         s.to_player_id,
         pf.name   AS settlement_from_name,
         pt.name   AS settlement_to_name,
         sess.group_id AS session_group_id
       FROM notifications n
       LEFT JOIN settlements s
         ON s.id = n.related_id
         AND n.type IN ('you_owe', 'payment_sent', 'payment_confirmed')
       LEFT JOIN players pf ON pf.id = s.from_player_id
       LEFT JOIN players pt ON pt.id = s.to_player_id
       LEFT JOIN sessions sess
         ON sess.id = n.related_id
         AND n.type IN ('session_pending', 'session_approved')
       WHERE n.user_id = ?
         AND NOT (n.type = 'session_pending' AND sess.status IS NOT NULL AND sess.status != 'pending')
       ORDER BY n.read ASC, n.created_at DESC
       LIMIT 100`
		)
		.bind(user_id)
		.all<NotificationRecord>();
	return result.results;
}

export async function getUnreadNotificationCount(db: D1Database, user_id: number): Promise<number> {
	const row = await db
		.prepare('SELECT COUNT(*) as count FROM notifications WHERE user_id = ? AND read = 0')
		.bind(user_id)
		.first<{ count: number }>();
	return row?.count ?? 0;
}

export async function markNotificationRead(db: D1Database, id: number): Promise<void> {
	await db.prepare('UPDATE notifications SET read = 1 WHERE id = ?').bind(id).run();
}

export async function markAllNotificationsRead(db: D1Database, user_id: number): Promise<void> {
	await db.prepare('UPDATE notifications SET read = 1 WHERE user_id = ?').bind(user_id).run();
}
