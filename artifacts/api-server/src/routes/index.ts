import { Router, type IRouter } from "express";
import healthRouter from "./health";
import professionalsRouter from "./professionals";
import patientsRouter from "./patients";
import appointmentsRouter from "./appointments";
import pipelineRouter from "./pipeline";
import dashboardRouter from "./dashboard";
import webhookRouter from "./webhook";

const router: IRouter = Router();

router.use(healthRouter);
router.use(professionalsRouter);
router.use(patientsRouter);
router.use(appointmentsRouter);
router.use(pipelineRouter);
router.use(dashboardRouter);
router.use(webhookRouter);

export default router;
