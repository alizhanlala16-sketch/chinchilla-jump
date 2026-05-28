const { sql } = require("@vercel/postgres");

const MAX_ROWS = 100;
const NAME_RE = /^[\p{L}\p{N}\s._-]{1,16}$/u;

let tableReady = false;

async function ensureTable() {
  if (tableReady) return;
  await sql`
    CREATE TABLE IF NOT EXISTS scores (
      id SERIAL PRIMARY KEY,
      name VARCHAR(16) NOT NULL,
      score INTEGER NOT NULL CHECK (score >= 0),
      height INTEGER NOT NULL CHECK (height >= 0),
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `;
  await sql`
    CREATE INDEX IF NOT EXISTS idx_scores_rank
    ON scores (score DESC, height DESC, created_at ASC)
  `;
  tableReady = true;
}

function sendJson(res, status, body) {
  res.statusCode = status;
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.setHeader("Cache-Control", "no-store");
  res.end(JSON.stringify(body));
}

function readBody(req) {
  return new Promise(function (resolve, reject) {
    let data = "";
    req.on("data", function (chunk) { data += chunk; });
    req.on("end", function () {
      if (!data) return resolve({});
      try { resolve(JSON.parse(data)); }
      catch (e) { reject(new Error("invalid json")); }
    });
    req.on("error", reject);
  });
}

function normalizeEntry(row) {
  return {
    name: row.name,
    score: row.score | 0,
    height: row.height | 0,
    date: row.date ? Number(row.date) : Date.now(),
  };
}

module.exports = async function handler(req, res) {
  if (req.method === "OPTIONS") {
    res.statusCode = 204;
    res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type");
    res.end();
    return;
  }

  if (!process.env.POSTGRES_URL) {
    sendJson(res, 503, { error: "database_not_configured" });
    return;
  }

  try {
    await ensureTable();

    if (req.method === "GET") {
      const { rows } = await sql`
        SELECT name, score, height,
          (EXTRACT(EPOCH FROM created_at) * 1000)::bigint AS date
        FROM scores
        ORDER BY score DESC, height DESC, created_at ASC
        LIMIT ${MAX_ROWS}
      `;
      const { rows: countRows } = await sql`
        SELECT COUNT(DISTINCT name)::int AS players FROM scores
      `;
      sendJson(res, 200, {
        entries: rows.map(normalizeEntry),
        totalPlayers: countRows[0] ? countRows[0].players : 0,
      });
      return;
    }

    if (req.method === "POST") {
      const body = await readBody(req);
      const name = String(body.name || "").trim().slice(0, 16);
      const score = body.score | 0;
      const height = body.height | 0;

      if (!name || !NAME_RE.test(name)) {
        sendJson(res, 400, { error: "invalid_name" });
        return;
      }
      if (score < 0 || score > 999999 || height < 0 || height > 999999) {
        sendJson(res, 400, { error: "invalid_score" });
        return;
      }

      await sql`
        INSERT INTO scores (name, score, height)
        VALUES (${name}, ${score}, ${height})
      `;

      const { rows } = await sql`
        SELECT name, score, height,
          (EXTRACT(EPOCH FROM created_at) * 1000)::bigint AS date
        FROM scores
        ORDER BY score DESC, height DESC, created_at ASC
        LIMIT ${MAX_ROWS}
      `;
      const { rows: countRows } = await sql`
        SELECT COUNT(DISTINCT name)::int AS players FROM scores
      `;

      sendJson(res, 201, {
        entries: rows.map(normalizeEntry),
        totalPlayers: countRows[0] ? countRows[0].players : 0,
      });
      return;
    }

    sendJson(res, 405, { error: "method_not_allowed" });
  } catch (err) {
    console.error("leaderboard api error:", err);
    sendJson(res, 500, { error: "server_error" });
  }
};
