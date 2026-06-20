export interface Provider {
  id: string;
  name: string;
  kind: "spa" | "restaurant" | "craftsman" | "other";
  created_at: number;
}

export interface Gift {
  id: string;
  provider_id: string;
  title: string;
  description: string;
  price_usd: string;
  currency: string;
  image_url: string | null;
  tag: string | null;
  active: number;
  created_at: number;
}

export interface Order {
  id: string;
  gift_id: string;
  buyer_address: string;
  amount_paid: string;
  network: string;
  payment_tx: string | null;
  token: string;
  message: string | null;
  recipient_name: string | null;
  status: "open" | "fulfilled";
  created_at: number;
  fulfilled_at: number | null;
}
