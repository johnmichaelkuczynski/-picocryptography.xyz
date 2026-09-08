import assert from "node:assert/strict";
import test from "node:test";
import { safeReturnTo } from "./auth-policy";
import { signedInLimitsAtFirstLogin } from "./trial-policy";
import {
  authenticatedOwnerCanRead,
  buildAccessState,
  shouldReuseLoginOwner,
} from "./access-state";

test("OAuth return targets must remain local to this application", () => {
  assert.equal(safeReturnTo("/course/lectures/4?mode=read"), "/course/lectures/4?mode=read");
  assert.equal(safeReturnTo("https://evil.example/steal"), "/");
  assert.equal(safeReturnTo("//evil.example/steal"), "/");
  assert.equal(safeReturnTo("/\\evil.example"), "/");
});

test("account switches cannot read records through a retained owner id", () => {
  assert.equal(
    authenticatedOwnerCanRead(202, { userId: 101, ownerId: "retained-owner" }),
    false,
  );
  assert.equal(shouldReuseLoginOwner(101, 202), false);
  assert.equal(shouldReuseLoginOwner(101, 101), true);
});

test("heartbeat and access use one complete CSRF-bearing response shape", () => {
  const state = buildAccessState({
    stage: "free",
    user: {
      id: 7,
      displayName: "Learner",
      email: "learner@example.test",
      isAdmin: false,
    },
    activeSeconds: 42,
    actionsUsed: 2,
    secondsLimit: 642,
    actionsLimit: 12,
    csrfToken: "rotated-token",
  });
  assert.equal(state.csrfToken, "rotated-token");
  assert.equal(state.user?.id, 7);
  assert.deepEqual(Object.keys(state).sort(), [
    "actionsLimit",
    "actionsUsed",
    "activeSeconds",
    "csrfToken",
    "secondsLimit",
    "stage",
    "user",
  ]);
});

test("sign-in grants the full allowance after inherited guest overage", () => {
  assert.deepEqual(
    signedInLimitsAtFirstLogin(
      { activeSeconds: 209, actionsUsed: 3 },
      { seconds: 600, actions: 10 },
    ),
    { secondsLimit: 809, actionsLimit: 13 },
  );
});