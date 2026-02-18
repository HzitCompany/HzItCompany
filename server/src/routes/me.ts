import { Router } from "express";
import { requireAuth, AuthedRequest } from "../middleware/auth.js";

export const meRouter = Router();

meRouter.get("/me", requireAuth, async (req: AuthedRequest, res) => {
  // Return the user info resolved by the middleware
  // This confirms the token is valid and the backend recognizes the user
  return res.json({
    ok: true,
    user: req.user
  });
});
