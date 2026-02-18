import { createApp } from "./app.js";
import { env } from "./lib/env.js";
import { logger } from "./lib/logger.js";
import { initDb } from "./lib/db.js";
import { ensureSchemaOrThrow } from "./lib/schema.js";
import { pricingRoutes } from "./routes/pricing.js";
import { contactRoutes } from "./routes/contact.js";
import { hireUsRoutes } from "./routes/hireUs.js";
import { schemaStatusRouter } from "./routes/schemaStatus.js";
import { authRouter } from "./routes/auth.js";
/* otpRouter and authSessionRouter removed */
import { ordersRouter } from "./routes/orders.js";
import { invoiceRouter } from "./routes/invoice.js";
import { adminRouter } from "./routes/admin.js";
import { meRouter } from "./routes/me.js";
import { submissionsRouter } from "./routes/submissions.js";
import { careersRouter } from "./routes/careers.js";
import { contentRouter } from "./routes/content.js";
import { errorHandler, notFound } from "./middleware/errorHandler.js";

function resolveListenPort() {
  // Render (and many PaaS providers) require binding to process.env.PORT.
  // If you listen on any other port, Render may report "No open ports detected".
  const raw = process.env.PORT ?? String(env.PORT ?? "");
  const parsed = Number(raw);
  if (Number.isFinite(parsed) && parsed > 0) return parsed;
  return 8080;
}

async function main() {
  const app = createApp();
  const port = resolveListenPort();

  // Track readiness — routes are mounted after DB connects.
  let isReady = false;

  // Always expose schema diagnostics.
  app.use("/api/schema", schemaStatusRouter);

  // Startup probe: returns 503 until the DB is connected and routes are mounted.
  app.use("/api/health", (_req, res) => {
    res.status(isReady ? 200 : 503).json({ ok: isReady, status: isReady ? "ready" : "starting" });
  });

  // While booting (Render cold start), return 503 for all other API routes.
  // This prevents confusing 404s before routers are mounted.
  app.use("/api", (req, res, next) => {
    if (isReady) return next();
    if (req.path.startsWith("/health") || req.path.startsWith("/schema")) return next();
    return res.status(503).json({ ok: false, error: "Server is starting, please retry." });
  });

  // ── START LISTENING IMMEDIATELY so Render sees the open port ──────────────
  // (Routes are added to a live Express app after listen() without issue.)
  logger.info({ corsOrigins: env.CORS_ORIGINS }, "CORS configured");
  app.listen(port, "0.0.0.0", () => {
    logger.info({ port, env: env.NODE_ENV }, "API server listening");
  });

  // ── DB INIT (in the same async flow, but server is already bound) ─────────
  try {
    await initDb();
  } catch (err) {
    logger.fatal({ err }, "DB connection failed after all retries — exiting");
    process.exit(1);
  }

  let schemaReady = true;
  try {
    await ensureSchemaOrThrow();
  } catch (err) {
    schemaReady = false;
    logger.error(
      { err },
      "Database schema missing; starting in diagnostics-only mode (apply server/db/schema.sql)"
    );
  }

  if (schemaReady) {
    app.use("/api/pricing", pricingRoutes);
    app.use("/api/contact", contactRoutes);
    app.use("/api/hire-us", hireUsRoutes);

    // Public CMS content (read-only)
    app.use("/api/content", contentRouter);

    app.use("/api", authRouter);
/* otpRouter and authSessionRouter removed */
    app.use("/api", meRouter);
    app.use("/api", submissionsRouter);
    app.use("/api/careers", careersRouter);
    app.use("/api", ordersRouter);
    app.use("/api", invoiceRouter);
    app.use("/api", adminRouter);
  } else {
    app.use("/api", (_req, res) => {
      return res.status(503).json({
        ok: false,
        error: "Database schema is missing or out of date. Apply server/db/schema.sql and redeploy."
      });
    });
  }

  app.use(notFound);
  app.use(errorHandler);

  isReady = true;
  logger.info("All routes mounted — server fully ready");
}

main().catch((err) => {
  logger.fatal({ err }, "Failed to start API server");
  process.exit(1);
});
