import { Router } from "express";
import { gateway, type PaidRequest } from "../payments.js";
import { getDb, getGift, createOrder as dbCreateOrder, getOrder, getOrderByToken, setOrderStatusByToken } from "../db.js";
import { mintOrderToken } from "../token.js";
import { usdToPrice } from "../../shared/money.js";

const router = Router();

router.get("/orders/buy",
  (req, res, next) => {
    const { productId, buyerAddress, message } = req.query;
    if (typeof productId !== "string" || typeof buyerAddress !== "string") {
      return res.status(422).json({ error: "productId and buyerAddress required" });
    }
    if (message != null && String(message).length > 280) {
      return res.status(422).json({ error: "message too long (max 280)" });
    }
    const db = getDb();
    const gift = getGift(db, productId);
    if (!gift || !gift.active) return res.status(404).json({ error: "gift not found" });
    res.locals.gift = gift;
    res.locals.price = usdToPrice(gift.price_usd);
    res.locals.buyerAddress = buyerAddress;
    res.locals.message = typeof message === "string" ? message : null;
    next();
  },
  (req, res, next) => gateway.require(res.locals.price)(req, res, next),
  async (req: PaidRequest, res) => {
    const db = getDb();
    const gift = res.locals.gift;
    const buyerAddress: string = res.locals.buyerAddress;
    // Gateway-batched payments use a delegate address; the Gateway facilitator
    // already verified the payment was authorized by the wallet owner.
    const token = mintOrderToken();
    const recipientName = req.query.recipientName;
    const order = dbCreateOrder(db, {
      gift_id: gift.id,
      buyer_address: buyerAddress,
      amount_paid: req.payment!.amount,
      network: req.payment!.network,
      payment_tx: req.payment!.transaction ?? null,
      token,
      message: res.locals.message,
      recipient_name: typeof recipientName === "string" ? recipientName.slice(0, 120) : null,
    });
    res.status(201).json({
      order: {
        id: order.id,
        status: order.status,
        url: `${process.env.BASE_URL}/o/${token}`,
        gift: { id: gift.id, title: gift.title },
        amount_paid: order.amount_paid,
        network: order.network,
        created_at: order.created_at,
      },
    });
  }
);

router.get("/orders/lookup", (req, res) => {
  const token = req.query.token;
  if (typeof token !== "string") {
    return res.status(400).json({ error: "token required" });
  }
  const db = getDb();
  const order = getOrderByToken(db, token);
  if (!order) return res.status(404).json({ error: "order not found" });
  res.json({
    order: {
      id: order.id,
      status: order.status,
      created_at: order.created_at,
      gift: {
        id: order.gift.id,
        title: order.gift.title,
        description: order.gift.description,
        image_url: order.gift.image_url,
        tag: order.gift.tag,
      },
      provider: order.gift.provider,
      message: order.message,
      recipient_name: order.recipient_name,
      amount_paid: order.amount_paid,
      network: order.network,
    },
  });
});

router.get("/orders/:id", (req, res) => {
  const db = getDb();
  const order = getOrder(db, req.params.id);
  if (!order) return res.status(404).json({ error: "order not found" });
  const gift = getGift(db, order.gift_id);
  const provider = gift?.provider;
  res.json({
    order: {
      id: order.id,
      status: order.status,
      created_at: order.created_at,
      gift: gift
        ? {
            id: gift.id,
            title: gift.title,
            description: gift.description,
            image_url: gift.image_url,
            tag: gift.tag,
          }
        : null,
      provider: provider ?? null,
      message: order.message,
      recipient_name: order.recipient_name,
      amount_paid: order.amount_paid,
      network: order.network,
      payment_tx: order.payment_tx,
    },
  });
});

router.post("/orders/fulfill", (req, res) => {
  const { token } = req.body as { token?: string };
  if (typeof token !== "string") {
    return res.status(400).json({ error: "token required" });
  }
  const db = getDb();
  const order = getOrderByToken(db, token);
  if (!order) return res.status(404).json({ error: "order not found" });
  if (order.status === "fulfilled") {
    return res.json({ ok: true, already: true, status: "fulfilled" });
  }
  const updated = setOrderStatusByToken(db, { token, status: "fulfilled" });
  if (!updated) return res.status(404).json({ error: "order not found" });
  res.json({ ok: true, status: updated.status });
});

export default router;
