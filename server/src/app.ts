import express from "express";
import helmet from "helmet";
import cors from "cors";

import { env } from "./lib/env.js";
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
      credentials: false,
      methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
      // Avoid being too strict here; let the middleware reflect request headers.
      maxAge: 600
    })
  );

  app.use(express.json({ limit: "200kb" }));

  // Rate limit all API routes.
  app.use("/api", apiRateLimit);

  // Health check
  app.get("/health", (_req, res) => res.json({ ok: true }));

  return app;
}
