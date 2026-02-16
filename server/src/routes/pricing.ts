import { Router } from "express";

export const pricingRoutes = Router();

pricingRoutes.get("/", async (_req, res) => {
  try {
    return res.json({
      services: [
        { name: "Website Development", price: 15000 },
        { name: "E-commerce Development", price: 30000 },
        { name: "Mobile App Development", price: 50000 },
        { name: "UI/UX Design", price: 8000 },
        { name: "SEO Optimization", price: 7000 }
      ]
    });
  } catch (_err) {
    return res.status(500).json({ success: false, error: "Internal server error" });
  }
});
