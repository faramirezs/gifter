import { Router } from "express";
import { timingSafeEqual } from "node:crypto";
import type { Request, Response, NextFunction } from "express";
import { getDb, listProviders as dbListProviders, listProviderGifts, createGift, updateGift, deactivateGift, getProvider } from "../db.js";
import { usdToPrice } from "../../shared/money.js";
const expectedRaw = process.env.PROVIDER_TOKEN;
if (!expectedRaw) throw new Error("PROVIDER_TOKEN must be set");
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
router.use("/provider", auth);

router.get("/provider/providers", (_req, res) => {
  const db = getDb();
  const providers = dbListProviders(db);
  res.json({ providers });
});

router.get("/provider/gifts", (req, res) => {
  const providerId = req.query.providerId;
  if (typeof providerId !== "string") {
    return res.status(400).json({ error: "providerId required" });
  }
  const db = getDb();
  const provider = getProvider(db, providerId);
  if (!provider) return res.status(403).json({ error: "unknown provider" });
  const gifts = listProviderGifts(db, providerId);
  res.json({ gifts });
});

router.post("/provider/gifts", (req, res) => {
  const { providerId, title, description, priceUsd, imageUrl, tag } = req.body as Record<string, unknown>;
  if (typeof providerId !== "string" || typeof title !== "string" || typeof description !== "string" || typeof priceUsd !== "string") {
    return res.status(400).json({ error: "providerId, title, description, and priceUsd required" });
  }
  try { usdToPrice(priceUsd); } catch {
    return res.status(422).json({ error: "invalid priceUsd" });
  }
  const db = getDb();
  const gift = createGift(db, {
    provider_id: providerId,
    title,
    description,
    price_usd: priceUsd,
    image_url: typeof imageUrl === "string" ? imageUrl : null,
    tag: typeof tag === "string" ? tag : null,
  });
  res.status(201).json({ gift });
});

router.patch("/provider/gifts/:id", (req, res) => {
  const db = getDb();
  const existing = db
    .prepare("SELECT * FROM gifts WHERE id = ?")
    .get(req.params.id) as Record<string, unknown> | null;
  if (!existing) return res.status(404).json({ error: "gift not found" });
  const body = req.body as Record<string, unknown>;
  const patch: Parameters<typeof updateGift>[2] = {};
  if (body.title !== undefined) patch.title = String(body.title);
  if (body.description !== undefined) patch.description = String(body.description);
  if (body.priceUsd !== undefined) {
    try { usdToPrice(String(body.priceUsd)); } catch {
      return res.status(422).json({ error: "invalid priceUsd" });
    }
    patch.price_usd = String(body.priceUsd);
  }
  if (body.imageUrl !== undefined) patch.image_url = String(body.imageUrl);
  if (body.tag !== undefined) patch.tag = String(body.tag);
  if (body.active !== undefined) patch.active = Number(body.active);
  const gift = updateGift(db, req.params.id, patch);
  if (!gift) return res.status(404).json({ error: "gift not found" });
  res.json({ gift });
});

router.delete("/provider/gifts/:id", (req, res) => {
  const db = getDb();
  const ok = deactivateGift(db, req.params.id);
  if (!ok) return res.status(404).json({ error: "gift not found" });
  res.json({ ok: true });
});

export default router;
