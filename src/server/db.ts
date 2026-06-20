import { readFileSync } from "node:fs";
import { mkdirSync } from "node:fs";
import { randomUUID } from "node:crypto";
import { DatabaseSync } from "node:sqlite";
import type { Gift, Order, Provider } from "../shared/types.js";

const dbPath = "./data/giftr.sqlite";

export function openDb(): DatabaseSync {
  mkdirSync("data", { recursive: true });
  const db = new DatabaseSync(dbPath);
  db.exec(readFileSync("src/server/migrate.sql", "utf8"));
  db.exec("PRAGMA journal_mode = WAL;");
  return db;
}

let db: DatabaseSync;
export function initDb(): () => DatabaseSync {
  db = openDb();
  return () => db;
}

export function getDb(): DatabaseSync {
  return db;
}

export function countProviders(db_: DatabaseSync): number {
  const row = db_.prepare("SELECT COUNT(*) as c FROM providers").get() as {
    c: number;
  };
  return Number(row.c);
}

export function listProviders(db_: DatabaseSync): Provider[] {
  const stmt = db_.prepare("SELECT id, name, kind, created_at FROM providers ORDER BY created_at DESC");
  const rows = stmt.all() as Array<{
    id: string;
    name: string;
    kind: string;
    created_at: number;
  }>;
  return rows.map((r) => ({
    id: r.id,
    name: r.name,
    kind: r.kind as Provider["kind"],
    created_at: Number(r.created_at),
  }));
}

export function getProvider(db_: DatabaseSync, id: string): Provider | null {
  const stmt = db_.prepare("SELECT id, name, kind, created_at FROM providers WHERE id = ?");
  const row = stmt.get(id) as {
    id: string;
    name: string;
    kind: string;
    created_at: number;
  } | null;
  if (!row) return null;
  return {
    id: row.id,
    name: row.name,
    kind: row.kind as Provider["kind"],
    created_at: Number(row.created_at),
  };
}

function rowToGiftWithProvider(row: Record<string, unknown>): Gift & { provider: Provider } {
  return {
    id: String(row.id),
    provider_id: String(row.provider_id),
    title: String(row.title),
    description: String(row.description),
    price_usd: String(row.price_usd),
    currency: String(row.currency),
    image_url: row.image_url == null ? null : String(row.image_url),
    tag: row.tag == null ? null : String(row.tag),
    active: Number(row.active),
    created_at: Number(row.created_at),
    provider: {
      id: String(row.p_id),
      name: String(row.p_name),
      kind: String(row.p_kind) as Provider["kind"],
      created_at: Number(row.p_created_at),
    },
  };
}

export function getGift(db_: DatabaseSync, id: string): (Gift & { provider: Provider }) | null {
  const stmt = db_.prepare(`
    SELECT g.*, p.id as p_id, p.name as p_name, p.kind as p_kind, p.created_at as p_created_at
    FROM gifts g
    JOIN providers p ON g.provider_id = p.id
    WHERE g.id = ?
  `);
  const row = stmt.get(id) as Record<string, unknown> | null;
  if (!row) return null;
  return rowToGiftWithProvider(row);
}

export function listGifts(
  db_: DatabaseSync,
  { q, kind, priceMax, limit }: { q?: string; kind?: string; priceMax?: number; limit?: number }
): (Gift & { provider: Provider })[] {
  const params: (string | number)[] = [];
  let sql = `
    SELECT g.*, p.id as p_id, p.name as p_name, p.kind as p_kind, p.created_at as p_created_at
    FROM gifts g
    JOIN providers p ON g.provider_id = p.id
    WHERE g.active = 1
  `;
  if (q && q.trim()) {
    const like = `%${q.trim()}%`;
    sql += " AND (g.title LIKE ? OR g.description LIKE ? OR g.tag LIKE ?)";
    params.push(like, like, like);
  }
  if (kind && kind.trim()) {
    sql += " AND p.kind = ?";
    params.push(kind.trim());
  }
  if (priceMax != null && priceMax > 0) {
    sql += " AND CAST(g.price_usd AS REAL) <= ?";
    params.push(priceMax);
  }
  sql += " ORDER BY CAST(g.price_usd AS REAL) ASC LIMIT ?";
  const clamped = Math.max(1, Math.min(100, limit ?? 20));
  params.push(clamped);
  const stmt = db_.prepare(sql);
  const rows = stmt.all(...params) as Record<string, unknown>[];
  return rows.map(rowToGiftWithProvider);
}

interface CreateGiftInput {
  provider_id: string;
  title: string;
  description: string;
  price_usd: string;
  image_url?: string | null;
  tag?: string | null;
}

export function createGift(
  db_: DatabaseSync,
  input: CreateGiftInput
): Gift & { provider: Provider } {
  const id = randomUUID();
  const created = Date.now();
  const stmt = db_.prepare(`
    INSERT INTO gifts (id, provider_id, title, description, price_usd, currency, image_url, tag, active, created_at)
    VALUES (?, ?, ?, ?, ?, 'USD', ?, ?, 1, ?)
  `);
  stmt.run(
    id,
    input.provider_id,
    input.title,
    input.description,
    input.price_usd,
    input.image_url ?? null,
    input.tag ?? null,
    created
  );
  const gift = getGift(db_, id);
  if (!gift) throw new Error("createGift failed insert");
  return gift;
}

interface UpdateGiftInput {
  title?: string;
  description?: string;
  price_usd?: string;
  image_url?: string | null;
  tag?: string | null;
  active?: number;
}

export function updateGift(
  db_: DatabaseSync,
  id: string,
  input: UpdateGiftInput
): Gift & { provider: Provider } | null {
  const sets: string[] = [];
  const params: (string | number | null)[] = [];
  if (input.title !== undefined) {
    sets.push("title = ?");
    params.push(input.title);
  }
  if (input.description !== undefined) {
    sets.push("description = ?");
    params.push(input.description);
  }
  if (input.price_usd !== undefined) {
    sets.push("price_usd = ?");
    params.push(input.price_usd);
  }
  if (input.image_url !== undefined) {
    sets.push("image_url = ?");
    params.push(input.image_url);
  }
  if (input.tag !== undefined) {
    sets.push("tag = ?");
    params.push(input.tag);
  }
  if (input.active !== undefined) {
    sets.push("active = ?");
    params.push(input.active);
  }
  if (sets.length === 0) return getGift(db_, id);
  params.push(id);
  db_.prepare(`UPDATE gifts SET ${sets.join(", ")} WHERE id = ?`).run(...params);
  return getGift(db_, id);
}

export function deactivateGift(db_: DatabaseSync, id: string): boolean {
  const stmt = db_.prepare("UPDATE gifts SET active = 0 WHERE id = ?");
  const result = stmt.run(id);
  return result.changes > 0;
}

export function listProviderGifts(db_: DatabaseSync, providerId: string): (Gift & { provider: Provider })[] {
  const stmt = db_.prepare(`
    SELECT g.*, p.id as p_id, p.name as p_name, p.kind as p_kind, p.created_at as p_created_at
    FROM gifts g
    JOIN providers p ON g.provider_id = p.id
    WHERE g.provider_id = ?
    ORDER BY g.created_at DESC
  `);
  const rows = stmt.all(providerId) as Record<string, unknown>[];
  return rows.map(rowToGiftWithProvider);
}

interface CreateOrderInput {
  gift_id: string;
  buyer_address: string;
  amount_paid: string;
  network: string;
  payment_tx: string | null;
  token: string;
  message: string | null;
  recipient_name: string | null;
}

function rowToOrder(row: Record<string, unknown>): Order {
  return {
    id: String(row.id),
    gift_id: String(row.gift_id),
    buyer_address: String(row.buyer_address),
    amount_paid: String(row.amount_paid),
    network: String(row.network),
    payment_tx: row.payment_tx == null ? null : String(row.payment_tx),
    token: String(row.token),
    message: row.message == null ? null : String(row.message),
    recipient_name: row.recipient_name == null ? null : String(row.recipient_name),
    status: String(row.status) as Order["status"],
    created_at: Number(row.created_at),
    fulfilled_at: row.fulfilled_at == null ? null : Number(row.fulfilled_at),
  };
}

export function createOrder(
  db_: DatabaseSync,
  input: CreateOrderInput
): Order {
  const id = randomUUID();
  const created = Date.now();
  const stmt = db_.prepare(`
    INSERT INTO orders (id, gift_id, buyer_address, amount_paid, network, payment_tx, token, message, recipient_name, status, created_at, fulfilled_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'open', ?, NULL)
  `);
  stmt.run(
    id,
    input.gift_id,
    input.buyer_address,
    input.amount_paid,
    input.network,
    input.payment_tx,
    input.token,
    input.message,
    input.recipient_name,
    created
  );
  const order = getOrder(db_, id);
  if (!order) throw new Error("createOrder failed insert");
  return order;
}

export function getOrder(db_: DatabaseSync, id: string): Order | null {
  const stmt = db_.prepare("SELECT * FROM orders WHERE id = ?");
  const row = stmt.get(id) as Record<string, unknown> | null;
  if (!row) return null;
  return rowToOrder(row);
}

export function getOrderByToken(db_: DatabaseSync, token: string): (Order & { gift: Gift & { provider: Provider } }) | null {
  const stmt = db_.prepare("SELECT * FROM orders WHERE token = ?");
  const row = stmt.get(token) as Record<string, unknown> | null;
  if (!row) return null;
  const order = rowToOrder(row);
  const gift = getGift(db_, order.gift_id);
  if (!gift) return null;
  return { ...order, gift };
}

export function setOrderStatus(
  db_: DatabaseSync,
  { id, status }: { id: string; status: "open" | "fulfilled" }
): Order | null {
  const fulfilled = status === "fulfilled" ? Date.now() : null;
  db_
    .prepare("UPDATE orders SET status = ?, fulfilled_at = ? WHERE id = ?")
    .run(status, fulfilled, id);
  return getOrder(db_, id);
}

export function setOrderStatusByToken(
  db_: DatabaseSync,
  { token, status }: { token: string; status: "open" | "fulfilled" }
): Order | null {
  const fulfilled = status === "fulfilled" ? Date.now() : null;
  db_
    .prepare("UPDATE orders SET status = ?, fulfilled_at = ? WHERE token = ?")
    .run(status, fulfilled, token);
  return getOrderByToken(db_, token);
}

export function listOrders(
  db_: DatabaseSync,
  { status, limit }: { status?: string; limit?: number }
): (Order & { gift_title: string; provider_name: string })[] {
  const params: (string | number)[] = [];
  let sql = `
    SELECT o.*, g.title as gift_title, p.name as provider_name
    FROM orders o
    JOIN gifts g ON o.gift_id = g.id
    JOIN providers p ON g.provider_id = p.id
    WHERE 1=1
  `;
  if (status) {
    sql += " AND o.status = ?";
    params.push(status);
  }
  sql += " ORDER BY o.created_at DESC LIMIT ?";
  const clamped = Math.max(1, Math.min(1000, limit ?? 50));
  params.push(clamped);
  const stmt = db_.prepare(sql);
  const rows = stmt.all(...params) as Record<string, unknown>[];
  return rows.map((row) => ({
    ...rowToOrder(row),
    gift_title: String(row.gift_title),
    provider_name: String(row.provider_name),
  }));
}
