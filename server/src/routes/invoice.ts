import { Router } from "express";
import PDFDocument from "pdfkit";

import { query } from "../lib/db.js";
import { requireAuth, requireAdmin, type AuthedRequest } from "../middleware/auth.js";
import { HttpError } from "../middleware/errorHandler.js";

export const invoiceRouter = Router();

invoiceRouter.get("/invoice/:orderId", requireAuth, async (req: AuthedRequest, res, next) => {
  try {
    if (!req.user) throw new HttpError(401, "Unauthorized", true);
    if (!req.user.email && req.user.role !== "admin") throw new HttpError(401, "Unauthorized", true);

    const orderId = Number(req.params.orderId);
    if (!Number.isFinite(orderId) || orderId <= 0) throw new HttpError(400, "Invalid order id", true);

    const rows = await query<{
      id: number;
      email: string;
      name: string;
      service_name: string;
      plan_name: string;
      price_inr: number;
      created_at: string;
      payment_status: string;
    }>(
      "select id, email, name, service_name, plan_name, price_inr, created_at, payment_status from orders where id = $1 limit 1",
      [orderId]
    );

    const order = rows[0];
    if (!order) throw new HttpError(404, "Order not found", true);

    const isOwner = !!req.user.email && order.email.toLowerCase() === req.user.email.toLowerCase();
    const isAdmin = req.user.role === "admin";
    if (!isOwner && !isAdmin) throw new HttpError(403, "Forbidden", true);

    if (order.payment_status !== "paid") throw new HttpError(400, "Invoice available after payment", true);

    const invRows = await query<{ invoice_number: string; issued_at: string }>(
      "select invoice_number, issued_at from invoices where order_id = $1 limit 1",
      [orderId]
    );

    const invoiceNumber = invRows[0]?.invoice_number ?? `HZ-${new Date().toISOString().slice(0, 10).replace(/-/g, "")}-${orderId}`;

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `inline; filename=invoice-${orderId}.pdf`);

    const doc = new PDFDocument({ size: "A4", margin: 50 });
    doc.pipe(res);

    doc.fontSize(20).text("INVOICE", { align: "right" });
    doc.moveDown();

    doc.fontSize(12).text("HZ IT Company");
    doc.text("India");
    doc.moveDown();

    doc.text(`Invoice Number: ${invoiceNumber}`);
    doc.text(`Date: ${new Date().toLocaleDateString("en-IN")}`);
    doc.text(`Order ID: ${order.id}`);
    doc.moveDown();

    doc.text("Billed To:");
    doc.text(order.name);
    doc.text(order.email);
    doc.moveDown();

    doc.text("Service Details:");
    doc.text(`Service: ${order.service_name}`);
    doc.text(`Plan: ${order.plan_name}`);
    doc.moveDown();

    doc.text(`Amount Paid: ₹${order.price_inr.toLocaleString("en-IN")}`);

    doc.end();
  } catch (err) {
    return next(err);
  }
});
