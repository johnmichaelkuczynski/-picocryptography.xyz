import { Router, type IRouter, type Request, type Response } from "express";
import {
  chargeHeartbeat,
  getAccessIdentity,
  getCsrfToken,
  getStage,
  isAdminUser,
} from "../lib/access";
import { logoutHandler } from "../lib/auth";
import { buildAccessState } from "../lib/access-state";

const router: IRouter = Router();

async function sendAccessState(req: Request, res: Response) {
  const identity = getAccessIdentity(req);
  const access = await getStage(identity);
  res.json(buildAccessState({
    stage: access.stage,
    user: req.user
      ? {
          id: req.user.id,
          displayName: req.user.displayName || req.user.username,
          email: req.user.email ?? "",
          isAdmin: isAdminUser(req),
        }
      : null,
    activeSeconds: access.usage.activeSeconds,
    actionsUsed: access.usage.actionsUsed,
    secondsLimit: access.secondsLimit,
    actionsLimit: access.actionsLimit,
    csrfToken: getCsrfToken(req),
  }));
}

router.get("/access", async (req, res) => {
  await sendAccessState(req, res);
});

router.post("/access/heartbeat", async (req, res) => {
  const identity = getAccessIdentity(req);
  await chargeHeartbeat(identity);
  await sendAccessState(req, res);
});

router.post("/auth/logout", logoutHandler);

export default router;