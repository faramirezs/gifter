export function usdToPrice(s: string): string {
  const n = Number(s);
  if (!Number.isFinite(n) || n <= 0) throw new Error("bad price");
  return `$${n.toFixed(2)}`;
}

export function formatUSDC(units: string): string {
  const n = Number(units);
  if (!Number.isFinite(n)) throw new Error("bad units");
  return `$${(n / 1_000_000).toFixed(2)}`;
}
