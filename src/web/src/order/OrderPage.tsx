import { useState, useEffect } from "react";
import { useParams } from "react-router-dom";

interface OrderGift {
  id: string;
  title: string;
  description: string;
  image_url: string | null;
  tag: string | null;
}

interface ProviderInfo {
  id: string;
  name: string;
  kind: string;
}

interface Order {
  id: string;
  status: "open" | "fulfilled";
  created_at: number;
  gift: OrderGift;
  provider: ProviderInfo;
  message: string | null;
  recipient_name: string | null;
  amount_paid: string;
  network: string;
}

export default function OrderPage() {
  const { token } = useParams<{ token: string }>();
  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionBusy, setActionBusy] = useState(false);
  const [actionMsg, setActionMsg] = useState<string | null>(null);

  useEffect(() => {
    if (!token) return;
    setLoading(true);
    fetch(`/api/orders/lookup?token=${encodeURIComponent(token)}`)
      .then(async (res) => {
        if (!res.ok) throw new Error(`${res.status}: ${await res.text()}`);
        const data = await res.json();
        if (data && data.order) setOrder(data.order as Order);
      })
      .catch((e) => setError(e instanceof Error ? e.message : String(e)))
      .finally(() => setLoading(false));
  }, [token]);

  const markFulfilled = async () => {
    if (!token) return;
    setActionBusy(true);
    setActionMsg(null);
    try {
      const res = await fetch("/api/orders/fulfill", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error ?? `${res.status}`);
      if (data?.already) {
        setActionMsg("Already redeemed");
      } else {
        setActionMsg("Redeemed");
      }
      // Refresh order state
      const lookup = await fetch(`/api/orders/lookup?token=${encodeURIComponent(token)}`);
      const up = await lookup.json();
      if (up && up.order) setOrder(up.order as Order);
    } catch (e) {
      setActionMsg(e instanceof Error ? e.message : String(e));
    } finally {
      setActionBusy(false);
    }
  };

  if (loading) return <div className="p-6 text-neutral-500">Loading...</div>;
  if (error) return <div className="p-6 text-red-600">Error: {error}</div>;
  if (!order) return <div className="p-6 text-red-600">Order not found.</div>;

  return (
    <div className="min-h-screen flex items-center justify-center p-6">
      <div className="w-full max-w-md bg-white rounded-xl shadow p-6">
        {order.status === "fulfilled" && (
          <div className="mb-4 bg-green-50 text-green-700 border border-green-200 rounded px-4 py-3 font-medium text-center">
            Already redeemed
          </div>
        )}

        {order.gift.image_url && (
          <img src={order.gift.image_url} alt={order.gift.title} className="w-full h-48 object-cover rounded-lg mb-4" />
        )}

        <h1 className="text-xl font-semibold mb-1">{order.gift.title}</h1>
        <p className="text-sm text-neutral-600 mb-3">{order.gift.description}</p>

        <div className="flex items-center gap-2 mb-3">
          <span className="inline-block bg-neutral-100 text-neutral-700 text-xs px-2 py-1 rounded">{order.provider.name}</span>
          <span className="text-xs text-neutral-500 capitalize">{order.provider.kind}</span>
        </div>

        {order.gift.tag && <span className="inline-block bg-blue-50 text-blue-700 text-xs px-2 py-1 rounded mb-3">{order.gift.tag}</span>}

        {order.recipient_name && (
          <div className="text-sm mb-2">
            <span className="font-medium">To:</span> {order.recipient_name}
          </div>
        )}

        {order.message && (
          <div className="bg-neutral-50 border border-neutral-200 rounded px-3 py-2 text-sm mb-4 italic">
            “{order.message}”
          </div>
        )}

        <div className="text-xs text-neutral-500 mb-4 space-y-1">
          <div>Amount: {order.amount_paid} units</div>
          <div>Network: {order.network}</div>
          <div>Created: {new Date(order.created_at).toLocaleString()}</div>
        </div>

        {order.status === "open" && (
          <button
            onClick={markFulfilled}
            disabled={actionBusy}
            className="w-full bg-green-600 text-white rounded-lg py-2.5 font-medium hover:bg-green-700 disabled:opacity-50"
          >
            {actionBusy ? "Processing..." : "Mark fulfilled"}
          </button>
        )}

        {actionMsg && (
          <div className="mt-3 text-center text-sm text-green-700">{actionMsg}</div>
        )}
      </div>
    </div>
  );
}
