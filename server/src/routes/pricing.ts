import { Router } from "express";

import { query } from "../lib/db.js";

export const pricingRoutes = Router();

pricingRoutes.get("/", async (_req, res, next) => {
  try {
    const rows = await query(
      [
        "select id, service_key, service_name, plan_key, plan_name, price_inr",
        "from services_pricing",
        "where is_active = true",
        "order by sort_order asc, service_key asc, plan_key asc"
      ].join("\n")
    );

    return res.json({ ok: true, items: rows });
  } catch (err) {
    return next(err);
  }
});
