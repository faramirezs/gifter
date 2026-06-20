import { useState, useEffect, useCallback } from "react";

interface Provider {
  id: string;
  name: string;
  kind: string;
}

interface Gift {
  id: string;
  provider_id: string;
  title: string;
  description: string;
  price_usd: string;
  image_url?: string | null;
  tag?: string | null;
  active: number;
}

const LS_KEY = "giftr_provider_token";

export default function ProviderDashboard() {
  const [token, setToken] = useState<string>(localStorage.getItem(LS_KEY) ?? "");
  const [providers, setProviders] = useState<Provider[]>([]);
  const [selectedProvider, setSelectedProvider] = useState<string>("");
  const [gifts, setGifts] = useState<Gift[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  // Form state
  const [form, setForm] = useState({
    title: "",
    description: "",
    priceUsd: "",
    imageUrl: "",
    tag: "",
  });

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

  const fetchProviders = useCallback(async () => {
    const res = await authorized("GET", "/api/provider/providers");
    const data = await res.json();
    const list: Provider[] = Array.isArray(data.providers) ? data.providers : [];
    setProviders(list);
    if (list.length > 0 && !selectedProvider) setSelectedProvider(list[0].id);
  }, [token, authorized]);

  const fetchGifts = useCallback(async (pid: string) => {
    const res = await authorized("GET", `/api/provider/gifts?providerId=${encodeURIComponent(pid)}`);
    const data = await res.json();
    setGifts(Array.isArray(data.gifts) ? data.gifts : []);
  }, [token, authorized]);

  useEffect(() => {
    if (!token) return;
    fetchProviders();
  }, [token, fetchProviders]);

  useEffect(() => {
    if (!selectedProvider) return;
    fetchGifts(selectedProvider);
  }, [selectedProvider, fetchGifts]);

  if (!token) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen p-6">
        <h1 className="text-2xl font-semibold mb-4">Provider Dashboard</h1>
        <div className="w-full max-w-sm bg-white p-6 rounded-lg shadow">
          <label className="block text-sm font-medium mb-2">Enter provider token</label>
          <input
            type="password"
            className="w-full border rounded px-3 py-2 mb-4"
            value={token}
            onChange={(e) => setToken(e.target.value)}
            placeholder="PROVIDER_TOKEN"
          />
          <button
            className="w-full bg-blue-600 text-white rounded px-3 py-2 hover:bg-blue-700"
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

  const handleAdd = async () => {
    setError(null);
    setPending(true);
    try {
      await authorized("POST", "/api/provider/gifts", {
        providerId: selectedProvider,
        title: form.title,
        description: form.description,
        priceUsd: form.priceUsd,
        imageUrl: form.imageUrl || undefined,
        tag: form.tag || undefined,
      });
      setForm({ title: "", description: "", priceUsd: "", imageUrl: "", tag: "" });
      await fetchGifts(selectedProvider);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setPending(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Deactivate this gift?")) return;
    setError(null);
    try {
      await authorized("DELETE", `/api/provider/gifts/${encodeURIComponent(id)}`);
      await fetchGifts(selectedProvider);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    }
  };

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-semibold">Provider Dashboard</h1>
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

      {error && <div className="mb-4 text-red-600 bg-red-50 border border-red-200 rounded px-4 py-3">{error}</div>}

      <div className="mb-6">
        <label className="block text-sm font-medium mb-1">Provider</label>
        <select
          className="border rounded px-3 py-2 bg-white"
          value={selectedProvider}
          onChange={(e) => setSelectedProvider(e.target.value)}
        >
          {providers.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name} ({p.kind})
            </option>
          ))}
        </select>
      </div>

      <div className="bg-white rounded-lg shadow p-6 mb-8">
        <h2 className="text-lg font-medium mb-4">Add gift</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-1">Title</label>
            <input className="w-full border rounded px-3 py-2" value={form.title} onChange={(e) => setForm((s) => ({ ...s, title: e.target.value }))} />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Price USD</label>
            <input className="w-full border rounded px-3 py-2" type="number" step="0.01" value={form.priceUsd} onChange={(e) => setForm((s) => ({ ...s, priceUsd: e.target.value }))} />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Tag</label>
            <input className="w-full border rounded px-3 py-2" value={form.tag} onChange={(e) => setForm((s) => ({ ...s, tag: e.target.value }))} />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Image URL</label>
            <input className="w-full border rounded px-3 py-2" value={form.imageUrl} onChange={(e) => setForm((s) => ({ ...s, imageUrl: e.target.value }))} />
          </div>
          <div className="sm:col-span-2">
            <label className="block text-sm font-medium mb-1">Description</label>
            <textarea className="w-full border rounded px-3 py-2" rows={3} value={form.description} onChange={(e) => setForm((s) => ({ ...s, description: e.target.value }))} />
          </div>
        </div>
        <button
          className="mt-4 bg-blue-600 text-white rounded px-4 py-2 hover:bg-blue-700 disabled:opacity-50"
          onClick={handleAdd}
          disabled={pending || !form.title || !form.description || !form.priceUsd}
        >
          {pending ? "Saving..." : "Add gift"}
        </button>
      </div>

      <div className="bg-white rounded-lg shadow overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-neutral-100">
            <tr>
              <th className="text-left px-4 py-2">Title</th>
              <th className="text-left px-4 py-2">Price</th>
              <th className="text-left px-4 py-2">Tag</th>
              <th className="text-left px-4 py-2">Status</th>
              <th className="px-4 py-2">Actions</th>
            </tr>
          </thead>
          <tbody>
            {gifts.map((g) => (
              <tr key={g.id} className="border-t">
                <td className="px-4 py-2">{g.title}</td>
                <td className="px-4 py-2">${g.price_usd}</td>
                <td className="px-4 py-2">{g.tag ?? "-"}</td>
                <td className="px-4 py-2">{g.active ? "Active" : "Inactive"}</td>
                <td className="px-4 py-2 text-right">
                  <button className="text-red-600 hover:underline" onClick={() => handleDelete(g.id)}>Deactivate</button>
                </td>
              </tr>
            ))}
            {gifts.length === 0 && (
              <tr><td className="px-4 py-6 text-neutral-500" colSpan={5}>No gifts yet.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
