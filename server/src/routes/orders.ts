import { Router } from "express";
import { z } from "zod";
import crypto from "crypto";

import { env } from "../lib/env.js";
import { query } from "../lib/db.js";
import { getRazorpayClient } from "../lib/razorpay.js";
import { HttpError } from "../middleware/errorHandler.js";
import { requireAuth, requireAdmin, type AuthedRequest } from "../middleware/auth.js";

export const ordersRouter = Router();

const createOrderSchema = z.object({
  pricingId: z.number().int().positive(),
  name: z.string().min(2).max(120),
  email: z.string().email().max(254)
});

ordersRouter.post("/orders", async (req, res, next) => {
  try {
    const parsed = createOrderSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ ok: false, error: "Invalid request", details: parsed.error.flatten() });
    }

    const pricingRows = await query<{
      id: number;
      service_key: string;
      service_name: string;
      plan_key: string;
      plan_name: string;
      price_inr: number;
      is_active: boolean;
    }>(
      "select id, service_key, service_name, plan_key, plan_name, price_inr, is_active from services_pricing where id = $1 limit 1",
      [parsed.data.pricingId]
    );

    const pricing = pricingRows[0];
    if (!pricing || !pricing.is_active) throw new HttpError(400, "Pricing plan not available", true);

    const amountPaise = pricing.price_inr * 100;

    const client = getRazorpayClient();
    if (!client) {
      throw new HttpError(503, "Payments not configured", true);
    }

    const orderInsert = await query<{ id: number }>(
      "insert into orders (name, email, service_key, service_name, plan_key, plan_name, price_inr, payment_status) values ($1,$2,$3,$4,$5,$6,$7,'pending') returning id",
      [parsed.data.name, parsed.data.email.toLowerCase(), pricing.service_key, pricing.service_name, pricing.plan_key, pricing.plan_name, pricing.price_inr]
    );

    const localOrderId = orderInsert[0]?.id;
    if (!localOrderId) throw new HttpError(500, "Failed to create order");

    const rpOrder = await client.orders.create({
      amount: amountPaise,
      currency: "INR",
      receipt: `hz_${localOrderId}`
    });

    await query(
      "update orders set razorpay_order_id = $1 where id = $2",
      [rpOrder.id, localOrderId]
    );

    return res.json({
      ok: true,
      orderId: localOrderId,
      razorpay: {
        keyId: env.RAZORPAY_KEY_ID,
        orderId: rpOrder.id,
        amount: amountPaise,
        currency: "INR"
      }
    });
  } catch (err) {
    return next(err);
  }
});

const verifySchema = z.object({
  orderId: z.number().int().positive(),
  razorpayOrderId: z.string().min(1),
  razorpayPaymentId: z.string().min(1),
  razorpaySignature: z.string().min(1)
});

ordersRouter.post("/payments/verify", async (req, res, next) => {
  try {
    const parsed = verifySchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ ok: false, error: "Invalid request", details: parsed.error.flatten() });
    }

    if (!env.RAZORPAY_KEY_SECRET) throw new HttpError(503, "Payments not configured", true);

    const rows = await query<{
      id: number;
      payment_status: string;
      razorpay_order_id: string | null;
      razorpay_payment_id: string | null;
    }>("select id, payment_status, razorpay_order_id, razorpay_payment_id from orders where id = $1 limit 1", [parsed.data.orderId]);

    const order = rows[0];
    if (!order) throw new HttpError(404, "Order not found", true);
    if (order.payment_status === "paid") return res.json({ ok: true, alreadyPaid: true });

    if (order.razorpay_order_id && order.razorpay_order_id !== parsed.data.razorpayOrderId) {
      throw new HttpError(400, "Order mismatch", true);
    }

    const body = `${parsed.data.razorpayOrderId}|${parsed.data.razorpayPaymentId}`;
    const expected = crypto.createHmac("sha256", env.RAZORPAY_KEY_SECRET).update(body).digest("hex");
    if (expected !== parsed.data.razorpaySignature) {
      throw new HttpError(400, "Invalid payment signature", true);
    }

    // Mark paid (idempotent-ish). Unique index prevents duplicate payment ids.
    await query(
      "update orders set payment_status='paid', razorpay_order_id=$1, razorpay_payment_id=$2, razorpay_signature=$3 where id=$4 and payment_status <> 'paid'",
      [parsed.data.razorpayOrderId, parsed.data.razorpayPaymentId, parsed.data.razorpaySignature, parsed.data.orderId]
    );

    // Ensure invoice record exists.
    const invoiceNumber = `HZ-${new Date().toISOString().slice(0, 10).replace(/-/g, "")}-${parsed.data.orderId}`;
    const invRows = await query<{ invoice_number: string }>(
      "insert into invoices (order_id, invoice_number) values ($1,$2) on conflict (order_id) do update set invoice_number = invoices.invoice_number returning invoice_number",
      [parsed.data.orderId, invoiceNumber]
    );

    return res.json({ ok: true, invoiceNumber: invRows[0]?.invoice_number ?? invoiceNumber });
  } catch (err) {
    return next(err);
  }
});

// Client portal
ordersRouter.get("/portal/orders", requireAuth, async (req: AuthedRequest, res, next) => {
  try {
    if (!req.user) throw new HttpError(401, "Unauthorized", true);
    if (!req.user.email) throw new HttpError(401, "Unauthorized", true);

    const rows = await query(
      "select id, created_at, service_name, plan_name, price_inr, payment_status, project_status from orders where email = $1 order by created_at desc",
      [req.user.email.toLowerCase()]
    );

    return res.json({ ok: true, items: rows });
  } catch (err) {
    return next(err);
  }
});

// Admin endpoints
ordersRouter.get("/admin/orders", requireAuth, requireAdmin, async (req: AuthedRequest, res, next) => {
  try {
    const search = String(req.query.search ?? "").trim().toLowerCase();

    const rows = search
      ? await query(
          "select id, created_at, name, email, service_name, plan_name, price_inr, payment_status, project_status from orders where lower(email) like $1 or lower(name) like $1 or cast(id as text) = $2 order by created_at desc limit 200",
          [`%${search}%`, search]
        )
      : await query(
          "select id, created_at, name, email, service_name, plan_name, price_inr, payment_status, project_status from orders order by created_at desc limit 200"
        );

    return res.json({ ok: true, items: rows });
  } catch (err) {
    return next(err);
  }
});

ordersRouter.get("/admin/summary", requireAuth, requireAdmin, async (_req, res, next) => {
  try {
    const totalOrders = await query<{ count: string }>("select count(*)::text as count from orders");
    const paidOrders = await query<{ count: string; revenue: string }>(
      "select count(*)::text as count, coalesce(sum(price_inr),0)::text as revenue from orders where payment_status='paid'"
    );

    return res.json({
      ok: true,
      totals: {
        orders: Number(totalOrders[0]?.count ?? 0),
        paidOrders: Number(paidOrders[0]?.count ?? 0),
        revenueInr: Number(paidOrders[0]?.revenue ?? 0)
      }
    });
  } catch (err) {
    return next(err);
  }
});
