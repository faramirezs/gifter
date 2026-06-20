import { createGatewayMiddleware } from "@circle-fin/x402-batching/server";
import type { Request } from "express";

export type PaidRequest = Request & {
  payment?: {
    verified: boolean;
    payer: string;
    amount: string;
    network: string;
    transaction?: string;
  };
};

export const gateway = createGatewayMiddleware({
  sellerAddress: process.env.SELLER_WALLET_ADDRESS!,
  facilitatorUrl:
    process.env.GATEWAY_FACILITATOR_URL ??
    "https://gateway-api-testnet.circle.com",
});

export function usdToPrice(s: string): string {
  const n = Number(s);
  if (!Number.isFinite(n) || n <= 0) throw new Error("bad price");
  return `$${n.toFixed(2)}`;
}
