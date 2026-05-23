import { Router, type IRouter } from "express";
import healthRouter from "./health";
import authRouter from "./auth";
import contentRouter from "./content";
import activitiesRouter from "./activities";
import usersRouter from "./users";
import notificationsRouter from "./notifications";
import callsRouter from "./calls";
import aiRouter from "./ai";
import contactRouter from "./contact";
import donationsRouter from "./donations";

const router: IRouter = Router();

router.use(healthRouter);
router.use(authRouter);
router.use(contentRouter);
router.use(activitiesRouter);
router.use(usersRouter);
router.use(notificationsRouter);
router.use(callsRouter);
router.use(aiRouter);
router.use(contactRouter);
router.use(donationsRouter);

export default router;
