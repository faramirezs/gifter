import { DatabaseSync } from "node:sqlite";
import { openDb } from "./db.js";

export function seed(db: DatabaseSync, { force = false }: { force?: boolean } = {}) {
  const countRow = db.prepare("SELECT COUNT(*) as c FROM providers").get() as {
    c: number;
  };
  const count = Number(countRow.c);
  if (!force && count > 0) {
    console.log("[seed] providers table already has rows, skipping seed");
    return;
  }

  console.log("[seed] inserting providers and gifts...");

  const insertProvider = db.prepare(
    "INSERT OR IGNORE INTO providers (id, name, kind, created_at) VALUES (?, ?, ?, ?)"
  );
  const insertGift = db.prepare(
    `INSERT OR IGNORE INTO gifts (id, provider_id, title, description, price_usd, currency, image_url, tag, active, created_at)
     VALUES (?, ?, ?, ?, ?, 'USD', ?, ?, 1, ?)`
  );

  const now = Date.now();

  const providers = [
    { id: "prov_spa_sereno", name: "Spa Sereno", kind: "spa" as const },
    { id: "prov_trattoria_sole", name: "Trattoria Sole", kind: "restaurant" as const },
    { id: "prov_bottega_legno", name: "Bottega del Legno", kind: "craftsman" as const },
    { id: "prov_penny_post", name: "Penny Post", kind: "craftsman" as const },
    { id: "prov_roast_well", name: "Roast Well", kind: "restaurant" as const },
    { id: "prov_verdant_home", name: "Verdant Home", kind: "other" as const },
  ];

  const gifts = [
    // ── Spa Sereno ──────────────────────────────────────────
    {
      id: "gift_deep_tissue_massage",
      providerId: "prov_spa_sereno",
      title: "Deep-Tissue Massage",
      description: "60 minutes of therapeutic deep-tissue massage targeting muscle knots and chronic tension. Includes heated table and aromatherapy.",
      priceUsd: "85.00",
      imageUrl: "https://images.unsplash.com/photo-1544161515-4ab6ce6db874?w=600&auto=format&q=80",
      tag: "massage",
    },
    {
      id: "gift_signature_facial",
      providerId: "prov_spa_sereno",
      title: "Signature Facial",
      description: "Rejuvenating 75-minute facial with organic botanicals, deep cleanse, exfoliation, and hydrating mask.",
      priceUsd: "120.00",
      imageUrl: "https://images.unsplash.com/photo-1515377905703-c4788e51af15?w=600&auto=format&q=80",
      tag: "facial",
    },
    {
      id: "gift_chair_massage",
      providerId: "prov_spa_sereno",
      title: "Express Chair Massage",
      description: "A quick 15-minute seated neck-and-shoulder massage. Perfect for a midday reset.",
      priceUsd: "20.00",
      imageUrl: "https://images.unsplash.com/photo-1600334129128-685c5582fd35?w=600&auto=format&q=80",
      tag: "massage",
    },

    // ── Trattoria Sole ───────────────────────────────────────
    {
      id: "gift_dinner_for_two",
      providerId: "prov_trattoria_sole",
      title: "Dinner for Two",
      description: "An intimate three-course dinner for two with a bottle of house wine. Seasonal Italian menu by candlelight.",
      priceUsd: "95.00",
      imageUrl: "https://images.unsplash.com/photo-1414235077428-338989a2e8c0?w=600&auto=format&q=80",
      tag: "dinner",
    },
    {
      id: "gift_seasonal_tasting",
      providerId: "prov_trattoria_sole",
      title: "Seasonal Tasting Menu",
      description: "Seven-course chef's tasting menu highlighting the season's best produce. Wine pairings included.",
      priceUsd: "150.00",
      imageUrl: "https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=600&auto=format&q=80",
      tag: "tasting",
    },
    {
      id: "gift_espresso_flight",
      providerId: "prov_trattoria_sole",
      title: "Espresso & Biscotti Flight",
      description: "Three single-origin espressos paired with house-baked almond biscotti. A 20-minute Italian coffee ritual.",
      priceUsd: "12.00",
      imageUrl: "https://images.unsplash.com/photo-1510591509098-f4fdc6d0ff04?w=600&auto=format&q=80",
      tag: "coffee",
    },

    // ── Bottega del Legno ────────────────────────────────────
    {
      id: "gift_olive_wood_board",
      providerId: "prov_bottega_legno",
      title: "Olive-Wood Cutting Board",
      description: "Handcrafted from reclaimed olive wood. Each board is unique, naturally antimicrobial, and finished with food-safe mineral oil.",
      priceUsd: "45.00",
      imageUrl: "https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?w=600&auto=format&q=80",
      tag: "handmade",
    },
    {
      id: "gift_hand_carved_spoon",
      providerId: "prov_bottega_legno",
      title: "Hand-Carved Spoon",
      description: "A single-piece hand-carved walnut spoon shaped with traditional tools. Finished with beeswax and walnut oil.",
      priceUsd: "28.00",
      imageUrl: "https://images.unsplash.com/photo-1506806732259-39c2d0268443?w=600&auto=format&q=80",
      tag: "handmade",
    },
    {
      id: "gift_wooden_coasters",
      providerId: "prov_bottega_legno",
      title: "Live-Edge Coaster Set",
      description: "Set of four coasters cut from a single branch cross-section. Sanded smooth, sealed with beeswax. No two alike.",
      priceUsd: "18.00",
      imageUrl: "https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=600&auto=format&q=80",
      tag: "handmade",
    },

    // ── Penny Post (new) ─────────────────────────────────────
    {
      id: "gift_custom_postcard",
      providerId: "prov_penny_post",
      title: "Custom Illustrated Postcard",
      description: "A one-of-a-kind hand-drawn postcard based on a photo or prompt you provide. Mailed anywhere in the world.",
      priceUsd: "5.00",
      imageUrl: "https://images.unsplash.com/photo-1579762715118-a6f1d4b934f1?w=600&auto=format&q=80",
      tag: "postcard",
    },
    {
      id: "gift_letterpress_card",
      providerId: "prov_penny_post",
      title: "Letterpress Notecard Set",
      description: "Six cotton letterpress cards with matching envelopes. Vintage type, hand-fed press, three designs.",
      priceUsd: "22.00",
      imageUrl: "https://images.unsplash.com/photo-1586075010923-2dd4570fb338?w=600&auto=format&q=80",
      tag: "stationery",
    },
    {
      id: "gift_wax_seal_kit",
      providerId: "prov_penny_post",
      title: "Wax Seal Starter Kit",
      description: "Brass seal stamp with your choice of initial, three wax colors, and a melting spoon. Tin included.",
      priceUsd: "14.00",
      imageUrl: "https://images.unsplash.com/photo-1596524430615-b46475ddff6e?w=600&auto=format&q=80",
      tag: "stationery",
    },

    // ── Roast Well (new) ─────────────────────────────────────
    {
      id: "gift_single_origin_bag",
      providerId: "prov_roast_well",
      title: "Single-Origin Coffee Bag",
      description: "340g of freshly roasted single-origin beans. Rotating selection — currently a washed Ethiopian Yirgacheffe.",
      priceUsd: "19.00",
      imageUrl: "https://images.unsplash.com/photo-1559056199-641a0ac8b55e?w=600&auto=format&q=80",
      tag: "coffee",
    },
    {
      id: "gift_pourover_kit",
      providerId: "prov_roast_well",
      title: "Pour-Over Starter Kit",
      description: "Ceramic V60 dripper, 40 paper filters, and a 200g bag of our house roast. Brew guide included.",
      priceUsd: "35.00",
      imageUrl: "https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?w=600&auto=format&q=80",
      tag: "coffee",
    },
    {
      id: "gift_espresso_tonic",
      providerId: "prov_roast_well",
      title: "Espresso Tonic",
      description: "A double shot over ice with Fever-Tree tonic and a twist of grapefruit. The perfect summer pick-me-up.",
      priceUsd: "7.00",
      imageUrl: "https://images.unsplash.com/photo-1509042239860-f550ce710b93?w=600&auto=format&q=80",
      tag: "coffee",
    },

    // ── Verdant Home (new) ───────────────────────────────────
    {
      id: "gift_monstera_plant",
      providerId: "prov_verdant_home",
      title: "Monstera Deliciosa",
      description: "A healthy medium monstera in a 6-inch nursery pot. The iconic split-leaf plant — thrives in bright indirect light.",
      priceUsd: "38.00",
      imageUrl: "https://images.unsplash.com/photo-1614594975525-e45190c55d0b?w=600&auto=format&q=80",
      tag: "plant",
    },
    {
      id: "gift_succulent_trio",
      providerId: "prov_verdant_home",
      title: "Succulent Trio",
      description: "Three miniature succulents in hand-thrown ceramic pots. Low-maintenance, high-charm desk companions.",
      priceUsd: "24.00",
      imageUrl: "https://images.unsplash.com/photo-1459411552884-841db9b3cc2a?w=600&auto=format&q=80",
      tag: "plant",
    },
    {
      id: "gift_herb_seedlings",
      providerId: "prov_verdant_home",
      title: "Herb Seedling Pack",
      description: "Six organic herb starter plugs — basil, mint, thyme, oregano, chives, and cilantro. Ready to pot on arrival.",
      priceUsd: "9.00",
      imageUrl: "https://images.unsplash.com/photo-1585320806297-9794b3e4eeae?w=600&auto=format&q=80",
      tag: "plant",
    },
  ];

  for (const p of providers) {
    insertProvider.run(p.id, p.name, p.kind, now);
  }
  for (const g of gifts) {
    insertGift.run(
      g.id,
      g.providerId,
      g.title,
      g.description,
      g.priceUsd,
      g.imageUrl,
      g.tag,
      now
    );
  }

  console.log(`[seed] inserted ${providers.length} providers and ${gifts.length} gifts`);
}

import { pathToFileURL } from "node:url";

const entry = process.argv[1];
const isEntry = entry && import.meta.url === pathToFileURL(entry).href;
if (isEntry) {
  const db = openDb();
  seed(db, { force: true });
  db.close();
}
