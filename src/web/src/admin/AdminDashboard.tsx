import { useState, useEffect, useCallback } from "react";

interface Order {
  id: string;
  gift_id: string;
  buyer_address: string;
  amount_paid: string;
  network: string;
  status: "open" | "fulfilled";
  created_at: number;
  fulfilled_at: number | null;
  gift_title: string;
  provider_name: string;
  token: string;
}

const LS_KEY = "giftr_admin_token";
const BASE = typeof window !== "undefined" ? window.location.origin : "";

export default function AdminDashboard() {
  const [token, setToken] = useState<string>(localStorage.getItem(LS_KEY) ?? "");
  const [statusFilter, setStatusFilter] = useState<string>("");
  const [orders, setOrders] = useState<Order[]>([]);
  const [error, setError] = useState<string | null>(null);

  const authorized = async (method: string, url: string, body?: unknown) => {
    const init: RequestInit = {
      method,
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    };
    if (body) init.body = JSON.stringify(body);
    const res = await fetch(url, init);
    if (!res.ok) throw new Error(`${res.status}: ${await res.text()}`);
    return res;
  };

  const load = useCallback(async () => {
    if (!token) return;
    setError(null);
    const params = new URLSearchParams();
    if (statusFilter) params.set("status", statusFilter);
    const res = await authorized("GET", `/api/admin/orders?${params.toString()}`);
    const data = await res.json();
    setOrders(Array.isArray(data.orders) ? data.orders : []);
  }, [token, statusFilter, authorized]);

  useEffect(() => {
    load();
  }, [load]);

  const setStatus = async (id: string, status: "open" | "fulfilled") => {
    setError(null);
    try {
      await authorized("POST", `/api/admin/orders/${encodeURIComponent(id)}/status`, { status });
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    }
  };

  const copyUrl = (text: string) => {
    void navigator.clipboard.writeText(text).catch(() => {});
  };

  if (!token) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen p-6">
        <h1 className="text-2xl font-semibold mb-4">Admin Dashboard</h1>
        <div className="w-full max-w-sm bg-white p-6 rounded-lg shadow">
          <label className="block text-sm font-medium mb-2">Enter admin token</label>
          <input
            type="password"
            className="w-full border rounded px-3 py-2 mb-4"
            value={token}
            onChange={(e) => setToken(e.target.value)}
            placeholder="ADMIN_TOKEN"
          />
          <button
            className="w-full bg-neutral-900 text-white rounded px-3 py-2 hover:bg-neutral-800"
            onClick={() => {
              localStorage.setItem(LS_KEY, token);
              window.location.reload();
            }}
          >
            Save
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-semibold">Admin Dashboard</h1>
        <div className="flex items-center gap-3">
          <select
            className="border rounded px-3 py-2 bg-white"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            <option value="">All statuses</option>
            <option value="open">Open</option>
            <option value="fulfilled">Fulfilled</option>
          </select>
          <button
            className="text-sm text-neutral-600 underline"
            onClick={() => {
              localStorage.removeItem(LS_KEY);
              window.location.reload();
            }}
          >
            Log out
          </button>
        </div>
      </div>

      {error && <div className="mb-4 text-red-600 bg-red-50 border border-red-200 rounded px-4 py-3">{error}</div>}

      <div className="bg-white rounded-lg shadow overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-neutral-100">
            <tr>
              <th className="text-left px-4 py-2">Gift</th>
              <th className="text-left px-4 py-2">Provider</th>
              <th className="text-left px-4 py-2">Buyer</th>
              <th className="text-left px-4 py-2">Amount</th>
              <th className="text-left px-4 py-2">Status</th>
              <th className="text-left px-4 py-2">Order link</th>
              <th className="px-4 py-2">Actions</th>
            </tr>
          </thead>
          <tbody>
            {orders.map((o) => (
              <tr key={o.id} className="border-t">
                <td className="px-4 py-2">{o.gift_title}</td>
                <td className="px-4 py-2">{o.provider_name}</td>
                <td className="px-4 py-2 font-mono text-xs">{o.buyer_address.slice(0, 8)}…{o.buyer_address.slice(-6)}</td>
                <td className="px-4 py-2">{o.amount_paid}</td>
                <td className="px-4 py-2">
                  <span className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${o.status === "open" ? "bg-green-100 text-green-700" : "bg-neutral-100 text-neutral-700"}`}>
                    {o.status}
                  </span>
                </td>
                <td className="px-4 py-2">
                  <a className="text-blue-600 hover:underline text-xs" href={`${BASE}/o/${o.token}`} target="_blank" rel="noreferrer">
                    Open
                  </a>
                  <button className="ml-2 text-xs text-neutral-500 underline" onClick={() => copyUrl(`${BASE}/o/${o.token}`)}>Copy</button>
                </td>
                <td className="px-4 py-2 text-right">
                  {o.status === "open" ? (
                    <button className="bg-green-600 text-white rounded px-3 py-1 text-xs hover:bg-green-700" onClick={() => setStatus(o.id, "fulfilled")}>Mark fulfilled</button>
                  ) : (
                    <button className="bg-neutral-200 text-neutral-800 rounded px-3 py-1 text-xs hover:bg-neutral-300" onClick={() => setStatus(o.id, "open")}>Re-open</button>
                  )}
                </td>
              </tr>
            ))}
            {orders.length === 0 && (
              <tr><td className="px-4 py-6 text-neutral-500" colSpan={7}>No orders yet.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
