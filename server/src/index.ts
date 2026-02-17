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
import { otpRouter } from "./routes/otp.js";
import { ordersRouter } from "./routes/orders.js";
import { invoiceRouter } from "./routes/invoice.js";
import { adminRouter } from "./routes/admin.js";
import { meRouter } from "./routes/me.js";
import { submissionsRouter } from "./routes/submissions.js";
import { careersRouter } from "./routes/careers.js";
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
  await initDb();
  await ensureSchemaOrThrow();

  const app = createApp();

  // Required mounts (frontend calls these exact endpoints)
  app.use("/api/pricing", pricingRoutes);
  app.use("/api/contact", contactRoutes);
  app.use("/api/hire-us", hireUsRoutes);
  app.use("/api/schema", schemaStatusRouter);

  // Existing platform endpoints
  app.use("/api", authRouter);
  app.use("/api/auth/otp", otpRouter);
  app.use("/api", meRouter);
  app.use("/api", submissionsRouter);
  app.use("/api/careers", careersRouter);
  app.use("/api", ordersRouter);
  app.use("/api", invoiceRouter);
  app.use("/api", adminRouter);

  app.use(notFound);
  app.use(errorHandler);

  const port = resolveListenPort();
  logger.info({ corsOrigins: env.CORS_ORIGINS }, "CORS configured");
  app.listen(port, "0.0.0.0", () => {
    logger.info({ port, env: env.NODE_ENV }, "API server listening");
  });
}

main().catch((err) => {
  logger.fatal({ err }, "Failed to start API server");
  process.exit(1);
});
