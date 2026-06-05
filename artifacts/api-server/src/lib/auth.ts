import { Request, Response, NextFunction } from "express";
import { db } from "@workspace/db";
import { userRoles } from "@workspace/db/schema";
import { eq } from "drizzle-orm";

export interface AuthUser {
  id: string;
  name: string | null;
  email: string | null;
  profileImage: string | null;
  roles?: string[];
}

declare global {
  namespace Express {
    interface Request {
      user?: AuthUser;
    }
  }
}

export async function requireAuth(req: Request, res: Response, next: NextFunction) {
  const user = (req as any).user;
  if (!user) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  next();
}

export async function getUserAdminRole(userId: string): Promise<string | null> {
  const roles = await db.select().from(userRoles).where(eq(userRoles.user_id, userId));
  if (roles.some((r) => r.role === "admin_principal")) return "admin_principal";
  if (roles.some((r) => r.role === "admin")) return "admin";
  if (roles.some((r) => r.role === "moderator")) return "moderator";
  return null;
}

export async function requireAdmin(req: Request, res: Response, next: NextFunction) {
  const user = (req as any).user;
  if (!user) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  const role = await getUserAdminRole(user.id);
  if (!role) {
    res.status(403).json({ error: "Forbidden" });
    return;
  }
  next();
}
