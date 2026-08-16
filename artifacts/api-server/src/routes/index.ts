import { Router, type IRouter } from "express";
import healthRouter from "./health";
import courseRouter from "./course";
import assignmentsRouter from "./assignments";
import practiceRouter from "./practice";
import practiceAssignmentsRouter from "./practiceAssignments";
import tutorRouter from "./tutor";
import detectionRouter from "./detection";
import analyticsRouter from "./analytics";
import diagnosticsRouter from "./diagnostics";
import reasoningRouter from "./reasoning";
import adminRouter from "./admin";
import { meterAnonymousAI } from "../aiMeter";

const router: IRouter = Router();

router.use(healthRouter);
// Routers whose write operations trigger AI generation are metered for
// signed-out visitors (small free preview, then Google login required).
router.use(meterAnonymousAI, courseRouter);
router.use(meterAnonymousAI, assignmentsRouter);
router.use(meterAnonymousAI, practiceRouter);
router.use(meterAnonymousAI, practiceAssignmentsRouter);
router.use(meterAnonymousAI, tutorRouter);
router.use(meterAnonymousAI, detectionRouter);
router.use(meterAnonymousAI, analyticsRouter);
router.use(meterAnonymousAI, diagnosticsRouter);
router.use(meterAnonymousAI, reasoningRouter);
router.use(adminRouter);

export default router;
