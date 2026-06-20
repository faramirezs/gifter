import { GatewayClient, type SupportedChainName } from "@circle-fin/x402-batching/client";

function parseArgs(argv: string[]): Record<string, string> {
  const out: Record<string, string> = {};
  for (const arg of argv) {
    if (!arg.startsWith("--")) continue;
    const kv = arg.slice(2);
    const idx = kv.indexOf("=");
    if (idx > -1) {
      out[kv.slice(0, idx)] = kv.slice(idx + 1);
    }
  }
  return out;
}

const args = parseArgs(process.argv.slice(2));

function env(key: string): string {
  const v = process.env[key];
  if (!v) throw new Error(`Missing env: ${key}`);
  return v;
}

const SUPPORTED: Record<string, true> = {
  arbitrumSepolia: true,
  arcTestnet: true,
  avalancheFuji: true,
  baseSepolia: true,
  sepolia: true,
  hyperEvmTestnet: true,
  optimismSepolia: true,
  polygonAmoy: true,
  seiAtlantic: true,
  sonicTestnet: true,
  unichainSepolia: true,
  worldChainSepolia: true,
  arbitrum: true,
  avalanche: true,
  base: true,
  optimism: true,
  polygon: true,
  sei: true,
  sonic: true,
  unichain: true,
  worldChain: true,
};

const chainCandidate = env("BUYER_CHAIN");
if (!SUPPORTED[chainCandidate]) {
  throw new Error(`Unsupported chain: ${chainCandidate}`);
}
const chain = chainCandidate as SupportedChainName;

const client = new GatewayClient({
  chain,
  privateKey: env("BUYER_PRIVATE_KEY") as `0x${string}`,
});

const baseUrl = env("BASE_URL");
const productId = args.productId;
const buyerAddress = args.buyerAddress;

if (!productId) throw new Error("Missing --productId");
if (!buyerAddress) throw new Error("Missing --buyerAddress");

const url = new URL(`${baseUrl}/api/orders/buy`);
url.searchParams.set("productId", productId);
url.searchParams.set("buyerAddress", buyerAddress);
if (args.message) url.searchParams.set("message", args.message);
if (args.recipientName) url.searchParams.set("recipientName", args.recipientName);

const result = await client.pay(url.toString());
console.log("Status:", result.status, "\nOrder:", JSON.stringify(result.data, null, 2));
