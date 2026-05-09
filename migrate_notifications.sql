CREATE TABLE IF NOT EXISTS settlements (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  session_id INTEGER NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
  from_player_id INTEGER NOT NULL REFERENCES players(id) ON DELETE CASCADE,
  to_player_id INTEGER NOT NULL REFERENCES players(id) ON DELETE CASCADE,
  amount INTEGER NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  created_at TEXT DEFAULT (datetime('now')),
  sent_at TEXT,
  resolved_at TEXT
);

CREATE INDEX IF NOT EXISTS idx_settlements_from ON settlements(from_player_id);
CREATE INDEX IF NOT EXISTS idx_settlements_to ON settlements(to_player_id);

CREATE TABLE IF NOT EXISTS notifications (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type TEXT NOT NULL,
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  related_id INTEGER,
  read INTEGER NOT NULL DEFAULT 0,
  created_at TEXT DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications(user_id, read);
