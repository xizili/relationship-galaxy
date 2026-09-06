CREATE TABLE messages (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  request_id TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL CHECK(length(name) BETWEEN 1 AND 30),
  body TEXT NOT NULL CHECK(length(body) BETWEEN 2 AND 1000),
  created_at INTEGER NOT NULL,
  visitor_hash TEXT,
  hidden INTEGER NOT NULL DEFAULT 0 CHECK(hidden IN (0, 1))
);
CREATE INDEX messages_public ON messages(hidden, id DESC);
CREATE INDEX messages_rate ON messages(visitor_hash, created_at);
