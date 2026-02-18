import express from "express";
import helmet from "helmet";
import cors from "cors";
import compression from "compression";
import cookieParser from "cookie-parser";

import { env } from "./lib/env.js";
import { pool } from "./lib/db.js";
import { apiRateLimit } from "./middleware/rateLimit.js";
import { requestLogger } from "./middleware/requestContext.js";
import { HttpError } from "./middleware/errorHandler.js";

function isOriginAllowed(origin: string, allowed: string[]) {
  return allowed.some((entry) => {
    if (entry === "*") return true;
    if (!entry.includes("*")) return entry === origin;

    // Support a single '*' wildcard (prefix*suffix)
    const [prefix, suffix] = entry.split("*");
    return origin.startsWith(prefix) && origin.endsWith(suffix ?? "");
  });
}

export function createApp() {
  const app = express();

  // Trust proxy when running behind a CDN / load balancer.
  app.set("trust proxy", 1);

  app.use(requestLogger);

  app.use(
    helmet({
      // Keep defaults; adjust CSP only after you finalize analytics scripts.
      contentSecurityPolicy: false,
      crossOriginEmbedderPolicy: false
    })
  );

  app.use(
    cors({
      origin: (origin, callback) => {
        if (!origin) return callback(null, true);
        const allowed = env.CORS_ORIGINS;

        if (isOriginAllowed(origin, allowed)) {
          // Return the explicit origin to ensure the header is set.
          return callback(null, origin);
        }
        return callback(
          new HttpError(
            403,
            `Not allowed by CORS (origin: ${origin}). Set CORS_ORIGINS to include this origin.`,
            true
          )
        );
      },
      credentials: true,
      methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
      allowedHeaders: ["Content-Type", "Authorization"],
      // Avoid being too strict here; let the middleware reflect request headers.
      maxAge: 600
    })
  );

  // Basic CSRF protection for cookie-authenticated endpoints.
  // If cookies are sent cross-site (SameSite=None), require an allowed Origin.
  app.use((req, _res, next) => {
    const safeMethods = new Set(["GET", "HEAD", "OPTIONS"]);
    if (safeMethods.has(req.method)) return next();

    const origin = req.get("origin");
    if (!origin) {
      // In production browser traffic, Origin is expected for cross-site requests.
      // Block missing-origin state changes to reduce CSRF exposure.
      if (env.NODE_ENV === "production") {
        return next(new HttpError(403, "Missing Origin header", true));
      }
      return next();
    }

    if (!isOriginAllowed(origin, env.CORS_ORIGINS)) {
      return next(new HttpError(403, "Blocked by CSRF origin check", true));
    }

    return next();
  });

  app.use(compression());

  app.use(cookieParser());

  app.use(express.json({ limit: "200kb" }));

  // Rate limit all API routes.
  app.use("/api", apiRateLimit);

  // Health check
  app.get("/health", (_req, res) => res.json({ ok: true }));
  app.get("/api/health", async (_req, res) => {
    try {
      await pool.query("select 1 as ok");
      return res.json({ ok: true, db: true });
    } catch {
      return res.status(503).json({ ok: false, db: false });
    }
  });

  return app;
}
