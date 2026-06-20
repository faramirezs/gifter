import { Router } from "express";
import { timingSafeEqual } from "node:crypto";
import type { Request, Response, NextFunction } from "express";
import { getDb, listOrders, getOrder, setOrderStatus, getGift, createOrder } from "../db.js";
import { mintOrderToken } from "../token.js";

const expectedRaw = process.env.ADMIN_TOKEN;
if (!expectedRaw) throw new Error("ADMIN_TOKEN must be set");
const expected: string = expectedRaw;

function auth(req: Request, res: Response, next: NextFunction) {
  const bearer = req.headers.authorization?.replace("Bearer ", "");
  const query = req.query.token;
  const token = bearer ?? (typeof query === "string" ? query : undefined);
  if (!token) return res.status(401).json({ error: "unauthorized" });
  if (!safeEqual(token, expected)) {
    return res.status(401).json({ error: "unauthorized" });
  }
  next();
}

function safeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  const bufA = Buffer.from(a);
  const bufB = Buffer.from(b);
  if (bufA.length !== bufB.length) return false;
  return timingSafeEqual(bufA, bufB);
}

const router = Router();
router.use("/admin", auth);

router.get("/admin/orders", (req, res) => {
  const db = getDb();
  const status = typeof req.query.status === "string" ? req.query.status : undefined;
  const rawLimit = req.query.limit;
  const limit = typeof rawLimit === "string" || typeof rawLimit === "number" ? Number(rawLimit) : undefined;
  const orders = listOrders(db, { status, limit });
  res.json({ orders });
});

router.post("/admin/orders/:id/status", (req, res) => {
  const { status } = req.body as { status?: string };
  if (status !== "open" && status !== "fulfilled") {
    return res.status(400).json({ error: "status must be open or fulfilled" });
  }
  const db = getDb();
  const order = getOrder(db, req.params.id);
  if (!order) return res.status(404).json({ error: "order not found" });
  const updated = setOrderStatus(db, { id: req.params.id, status });
  if (!updated) return res.status(404).json({ error: "order not found" });
  res.json({ ok: true, status: updated.status, fulfilled_at: updated.fulfilled_at });
});

// ── Dev-only: mock order creation (token-gated) ──────────────────
router.post("/admin/mock-order", (req, res) => {
  if (process.env.NODE_ENV === "production") {
    return res.status(403).json({ error: "mock endpoint disabled in production" });
  }
  const { giftId, buyerAddress, message, recipientName } = req.body as {
    giftId?: string;
    buyerAddress?: string;
    message?: string;
    recipientName?: string;
  };
  if (!giftId || !buyerAddress) {
    return res.status(422).json({ error: "giftId and buyerAddress required" });
  }
  const gift = getGift(getDb(), giftId);
  if (!gift) return res.status(404).json({ error: "gift not found" });

  const order = createOrder(getDb(), {
    gift_id: gift.id,
    buyer_address: buyerAddress,
    amount_paid: String(Number(gift.price_usd) * 1_000_000),
    network: "eip155:5042002",
    payment_tx: "0xMOCK_" + Date.now(),
    token: mintOrderToken(),
    message: message ?? null,
    recipient_name: recipientName ?? null,
  });

  res.status(201).json({
    order: {
      id: order.id,
      status: order.status,
      url: `${process.env.BASE_URL ?? "http://localhost:3000"}/o/${order.token}`,
      gift: { id: gift.id, title: gift.title },
      amount_paid: order.amount_paid,
      network: order.network,
      created_at: order.created_at,
    },
    _hint: "Order URL is the delivery. Recipient opens it to view/redeem. Provider/admin taps 'Mark fulfilled' for on-site redemption. ARC-TESTNET demo.",
  });
});
export default router;
