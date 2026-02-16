import { createApp } from "./app.js";
import { env } from "./lib/env.js";
import { logger } from "./lib/logger.js";
import { initDb } from "./lib/db.js";
import { pricingRoutes } from "./routes/pricing.js";
import { contactRoutes } from "./routes/contact.js";
import { hireUsRoutes } from "./routes/hireUs.js";
import { authRouter } from "./routes/auth.js";
import { ordersRouter } from "./routes/orders.js";
import { invoiceRouter } from "./routes/invoice.js";
import { adminRouter } from "./routes/admin.js";
import { errorHandler, notFound } from "./middleware/errorHandler.js";

function isAddrInUseError(err: unknown) {
  const anyErr = err as any;
  return anyErr?.code === "EADDRINUSE";
}

async function listenWithFallback(app: ReturnType<typeof createApp>, startPort: number) {
  // Keep the retry window small and predictable.
  const maxAttempts = 20;

  for (let attempt = 0; attempt <= maxAttempts; attempt++) {
    const port = startPort + attempt;

    try {
      const server = await new Promise<import("node:http").Server>((resolve, reject) => {
        const s = app.listen(port, () => resolve(s));
        s.on("error", reject);
      });

      return { server, port };
    } catch (err) {
      if (isAddrInUseError(err) && attempt < maxAttempts) {
        logger.warn({ port }, "Port in use, trying next port");
        continue;
      }
      throw err;
    }
  }

  throw new Error("No available port found");
}

async function main() {
  await initDb();

  const app = createApp();

  // Required mounts (frontend calls these exact endpoints)
  app.use("/api/pricing", pricingRoutes);
  app.use("/api/contact", contactRoutes);
  app.use("/api/hire-us", hireUsRoutes);

  // Existing platform endpoints
  app.use("/api", authRouter);
  app.use("/api", ordersRouter);
  app.use("/api", invoiceRouter);
  app.use("/api", adminRouter);

  app.use(notFound);
  app.use(errorHandler);

  const startPort = env.PORT ?? 8080;
  const { port } = await listenWithFallback(app, startPort);
  logger.info({ port, env: env.NODE_ENV }, "API server listening");
}

main().catch((err) => {
  logger.fatal({ err }, "Failed to start API server");
  process.exit(1);
});
