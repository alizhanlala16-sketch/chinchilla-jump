-- Chinchilla & Jump — global leaderboard (Vercel Postgres / Neon)
-- Run once in Vercel Storage → Postgres → Query, or let /api/leaderboard auto-create on first request.

CREATE TABLE IF NOT EXISTS scores (
  id SERIAL PRIMARY KEY,
  name VARCHAR(16) NOT NULL,
  score INTEGER NOT NULL CHECK (score >= 0),
  height INTEGER NOT NULL CHECK (height >= 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_scores_rank
  ON scores (score DESC, height DESC, created_at ASC);
