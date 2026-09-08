import assert from "node:assert/strict";
import pg from "pg";

if (
  process.env.NODE_ENV === "production" ||
  process.env.REPLIT_DEPLOYMENT === "1"
) {
  throw new Error("Refusing to run access fixtures against a production runtime");
}
if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL is required");

const base = process.env.ACCESS_TEST_URL || "http://localhost:80";
const devHost = process.env.REPLIT_DEV_DOMAIN;
const proxyHeaders = {
  "x-forwarded-proto": "https",
  ...(devHost ? { "x-forwarded-host": devHost } : {}),
};
const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: /@(localhost|127\.0\.0\.1)[:/]/.test(process.env.DATABASE_URL)
    ? false
    : { rejectUnauthorized: false },
});

let cookie = "";
let sid = "";
let csrf = "";
const fixtureUsers = [];

async function request(path, init = {}) {
  const response = await fetch(base + path, {
    ...init,
    headers: {
      ...proxyHeaders,
      ...(cookie ? { cookie } : {}),
      ...(csrf ? { "x-csrf-token": csrf } : {}),
      ...(init.body ? { "content-type": "application/json" } : {}),
      ...init.headers,
    },
    redirect: "manual",
  });
  const setCookie = response.headers.get("set-cookie");
  if (setCookie) {
    cookie = setCookie.split(";", 1)[0];
    const encoded = cookie.slice(cookie.indexOf("=") + 1);
    const signed = decodeURIComponent(encoded).replace(/^s:/, "");
    sid = signed.slice(0, signed.lastIndexOf("."));
  }
  const body = await response.json().catch(() => null);
  if (body?.csrfToken) csrf = body.csrfToken;
  return { response, body };
}

async function sessionData() {
  const result = await pool.query(
    "select sess from user_sessions where sid = $1",
    [sid],
  );
  assert.equal(result.rowCount, 1);
  return result.rows[0].sess;
}

async function setSessionUser(userId, staleAccessUserId = userId) {
  const sess = await sessionData();
  sess.passport = { user: userId };
  sess.accessUserId = staleAccessUserId;
  await pool.query("update user_sessions set sess = $2 where sid = $1", [
    sid,
    JSON.stringify(sess),
  ]);
}

try {
  const initial = await request("/api/access");
  assert.equal(initial.response.status, 200);
  assert.equal(initial.body.stage, "guest");
  const initialOwner = (await sessionData()).ownerId;

  await pool.query(
    "update trial_usage set actions_used = 3 where owner_id = $1 and user_id is null",
    [initialOwner],
  );
  const guestGate = await request("/api/course/overview");
  assert.equal(guestGate.response.status, 401);
  assert.equal(guestGate.body.code, "LOGIN_REQUIRED");

  const assignment = await pool.query(
    `select a.id as assignment_id, p.id as problem_id
       from assignments a join problems p on p.assignment_id = a.id
      order by a.id, p.id limit 1`,
  );
  assert.equal(assignment.rowCount, 1);
  const suffix = `${Date.now()}-${process.pid}`;
  const userA = await pool.query(
    `insert into users(username, google_id, email, display_name)
     values ($1, $2, $3, 'Fixture A') returning id`,
    [`access-fixture-a-${suffix}`, `fixture-google-a-${suffix}`, null],
  );
  const userB = await pool.query(
    `insert into users(username, google_id, email, display_name)
     values ($1, $2, $3, 'Fixture B') returning id`,
    [`access-fixture-b-${suffix}`, `fixture-google-b-${suffix}`, null],
  );
  fixtureUsers.push(userA.rows[0].id, userB.rows[0].id);

  await setSessionUser(userA.rows[0].id, undefined);
  const signed = await request("/api/access");
  assert.equal(signed.response.status, 200);
  assert.equal(signed.body.stage, "free");
  assert.equal(signed.body.actionsLimit - signed.body.actionsUsed, 10);
  assert.equal(signed.body.secondsLimit - signed.body.activeSeconds, 600);

  const attempt = await pool.query(
    `insert into attempts(assignment_id, status, owner_id, user_id)
     values ($1, 'in_progress', $2, $3) returning id`,
    [
      assignment.rows[0].assignment_id,
      (await sessionData()).ownerId,
      userA.rows[0].id,
    ],
  );
  await pool.query(
    `update trial_usage set actions_used = $2
      where user_id = $1`,
    [userA.rows[0].id, signed.body.actionsLimit],
  );
  const paidGate = await request("/api/course/overview");
  assert.equal(paidGate.response.status, 402);
  assert.equal(paidGate.body.code, "PAYMENT_REQUIRED");

  const draft = await request(
    `/api/assignments/attempts/${attempt.rows[0].id}/answer`,
    {
      method: "PUT",
      body: JSON.stringify({
        problemId: assignment.rows[0].problem_id,
        answer: "fixture recovery answer",
        gradeNow: false,
        trace: { keystrokeCount: 23, eraseCount: 0, durationMs: 1000 },
      }),
    },
  );
  assert.equal(draft.response.status, 200);
  const recovery = await request(
    `/api/assignments/attempts/${attempt.rows[0].id}`,
  );
  assert.equal(recovery.response.status, 200);

  await setSessionUser(userB.rows[0].id, userA.rows[0].id);
  const switched = await request("/api/access");
  assert.equal(switched.response.status, 200);
  assert.equal(switched.body.user.id, userB.rows[0].id);
  const isolated = await request(
    `/api/assignments/attempts/${attempt.rows[0].id}`,
  );
  assert.equal(isolated.response.status, 404);

  const fakeVerify = await request("/api/billing/verify", {
    method: "POST",
    body: JSON.stringify({ sessionId: "cs_live_fixture_not_real" }),
  });
  assert.notEqual(fakeVerify.response.status, 200);
  const status = await request("/api/billing/status");
  assert.equal(status.body.paid, false);

  const heartbeat = await request("/api/access/heartbeat", {
    method: "POST",
    body: "{}",
  });
  assert.equal(heartbeat.response.status, 200);
  for (const key of [
    "stage",
    "user",
    "activeSeconds",
    "actionsUsed",
    "secondsLimit",
    "actionsLimit",
    "csrfToken",
  ]) {
    assert.ok(Object.hasOwn(heartbeat.body, key));
  }
  const chained = await request("/api/access/heartbeat", {
    method: "POST",
    body: "{}",
  });
  assert.equal(chained.response.status, 200);

  console.log("PASS scoped HTTP/DB access regression");
} finally {
  if (sid) {
    await pool.query("delete from user_sessions where sid = $1", [sid]);
  }
  for (const userId of fixtureUsers.reverse()) {
    await pool.query("delete from users where id = $1", [userId]);
  }
  await pool.end();
}