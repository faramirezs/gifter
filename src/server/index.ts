import "dotenv/config";
import express from "express";
import path from "node:path";
import { initDb, countProviders, getDb } from "./db.js";
import { seed } from "./seed.js";
import catalogRoutes from "./routes/catalog.js";
import ordersRoutes from "./routes/orders.js";
import providerRoutes from "./routes/provider.js";
import adminRoutes from "./routes/admin.js";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

function requireEnv(key: string): string {
  const v = process.env[key];
  if (!v) throw new Error(`Missing required env: ${key}`);
  return v;
}

requireEnv("SELLER_WALLET_ADDRESS");
requireEnv("PROVIDER_TOKEN");
requireEnv("ADMIN_TOKEN");

const app = express();
app.use(express.json());

// ── Agent hint middleware ──────────────────────────────────────
// Injects instructions visible to AI agents consuming this API.
app.use("/api", (_req, res, next) => {
  res.setHeader(
    "X-Agent-Hint",
    "ARC-TESTNET chain required. Fund your Circle Gateway wallet on Arc Testnet (chain eip155:5042002, USDC: 0x360000000000000000000000000000000000000000). Use GatewayClient.pay() with batching. This is a demo MVP."
  );
  next();
});
initDb();
const db = getDb();
if (countProviders(db) === 0) {
  seed(db, { force: true });
} else {
  console.log("[boot] providers already seeded; skipping seed");
}

app.use("/api", catalogRoutes);
app.use("/api", ordersRoutes);
app.use("/api", providerRoutes);
app.use("/api", adminRoutes);

if (process.env.NODE_ENV === "production") {
  const dist = path.resolve(__dirname, "../../web");
  app.use(express.static(dist));
  app.get(["/o/:token", "/provider", "/admin", "/"], (req, res, next) => {
    if (req.path.startsWith("/api")) return next();
    res.sendFile(path.join(dist, "index.html"));
  });
} else {
  console.log("[boot] dev mode: Vite serves static files; Express only runs API");
}

const PORT = Number(process.env.PORT ?? 3000);
app.listen(PORT, () => {
  console.log(`[boot] listening on http://localhost:${PORT}`);
});
