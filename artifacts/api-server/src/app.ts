import express, { type Express, type Request, type Response, type NextFunction } from "express";
import cors from "cors";
import pinoHttp from "pino-http";
import cookieParser from "cookie-parser";
import path from "path";
import { fileURLToPath } from "url";
import router from "./routes";
import { logger } from "./lib/logger";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const app: Express = express();

app.use(
  pinoHttp({
    logger,
    serializers: {
      req(req) {
        return { id: req.id, method: req.method, url: req.url?.split("?")[0] };
      },
      res(res) {
        return { statusCode: res.statusCode };
      },
    },
  }),
);

app.use(cors({ origin: true, credentials: true }));
app.use(cookieParser());
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true }));

// Replit Auth middleware — reads the X-Replit-User-* headers injected by the proxy
app.use((req: Request, _res: Response, next: NextFunction) => {
  const userId = req.headers["x-replit-user-id"] as string | undefined;
  const userName = req.headers["x-replit-user-name"] as string | undefined;
  const userRoles = req.headers["x-replit-user-roles"] as string | undefined;
  const userProfileImage = req.headers["x-replit-user-profile-image"] as string | undefined;
  const userBio = req.headers["x-replit-user-bio"] as string | undefined;
  const userTeams = req.headers["x-replit-user-teams"] as string | undefined;
  const userUrl = req.headers["x-replit-user-url"] as string | undefined;

  if (userId) {
    (req as any).user = {
      id: userId,
      name: userName || null,
      email: null,
      profileImage: userProfileImage || null,
      roles: userRoles ? userRoles.split(",") : [],
    };
  }

  next();
});

app.use("/api", router);

// Serve the built frontend in production
const frontendDist = path.resolve(__dirname, "../../3v-app/dist/public");
app.use(express.static(frontendDist));
app.get("*splat", (_req, res) => {
  res.sendFile(path.join(frontendDist, "index.html"));
});

export default app;
