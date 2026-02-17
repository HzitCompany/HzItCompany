import express from "express";
import helmet from "helmet";
import cors from "cors";

import { env } from "./lib/env.js";
import { apiRateLimit } from "./middleware/rateLimit.js";
import { requestLogger } from "./middleware/requestContext.js";
import { HttpError } from "./middleware/errorHandler.js";

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
        const isAllowed = allowed.some((entry) => {
          if (entry === "*") return true;
          if (!entry.includes("*")) return entry === origin;

          // Support a single '*' wildcard (prefix*suffix)
          const [prefix, suffix] = entry.split("*");
          return origin.startsWith(prefix) && origin.endsWith(suffix ?? "");
        });

        if (isAllowed) return callback(null, true);
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
      allowedHeaders: ["Content-Type", "Authorization"],
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
