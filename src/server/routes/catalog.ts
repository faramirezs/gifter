import { Router } from "express";
import { getDb, getGift, listGifts } from "../db.js";

const router = Router();

router.get("/catalog", (req, res) => {
  const q = typeof req.query.q === "string" ? req.query.q : undefined;
  const kind = typeof req.query.kind === "string" ? req.query.kind : undefined;
  const rawLimit = req.query.limit;
  const limit =
    typeof rawLimit === "string" || typeof rawLimit === "number"
      ? Number(rawLimit)
      : undefined;
  const rawPriceMax = req.query.priceMax;
  const priceMax =
    typeof rawPriceMax === "string" || typeof rawPriceMax === "number"
      ? Number(rawPriceMax)
      : undefined;
  const db = getDb();
  const gifts = listGifts(db, { q, kind, limit, priceMax });
  res.json({ gifts, _hint: "Use ARC-TESTNET (eip155:5042002). Fund Circle Gateway wallet. Pay with GatewayClient.pay() batching. Demo MVP." });
});

router.get("/catalog/:id", (req, res) => {
  const db = getDb();
  const gift = getGift(db, req.params.id);
  if (!gift) return res.status(404).json({ error: "gift not found" });
  res.json({ gift, _hint: "To buy: POST /api/orders/buy?productId=<id>&buyerAddress=<0x>. Chain: ARC-TESTNET. Fund Circle Gateway first." });
});

export default router;
