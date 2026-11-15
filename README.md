# The Court of Stones

Solo Splendor roguelike for a local web browser. Medieval courts trade gemstones as noble treasure. One campaign, twenty-turn rounds, sector climb. No nobles, no gold, no token caps.

This is original work and is **not** related to the Solitaire roguelike.

## Run in a browser

```bash
npm install
npm run dev
```

Then open the URL Vite prints (usually [http://localhost:5173](http://localhost:5173)). The board is portrait-first: stacked market / treasure / tableau, large tap targets, no hover-only controls. A phone browser at ~390px wide is a supported layout.

| Command | What it does |
| --- | --- |
| `npm run dev` | Local Vite server |
| `npm run build` | Production build |
| `npm run preview` | Serve the production build |
| `npm test` | Engine unit tests |

## How to play (v1)

- Each round is **20 turns**. Hit that round’s prestige target to win.
- Sector 1 targets: **1 / 2 / 3**. Round 3 is the boss. Later sectors follow the design formula.
- One action per turn: take **3 different** tokens, take **2 of the same**, **buy** a charter, or **reserve** one face-up charter (single coffer).
- Unlimited white / blue / green / red / black tokens. Tableau bonuses discount later buys.
- A win turns leftover prestige into money (boss pays double). Then attach **one rank-locked seal**. After a boss, the shop offers Enhance ($4) and Dismantle ($3).
- A loss retries the same round. Collection and purse stay put.

**Royal decree (win round)** is a debug control so you can review upgrade seals and the shop without grinding sector 1.

## Art

Cards, gems, shop stalls, and upgrade seals are original CSS / SVG. Houses: Argent (pearl), Azure (sapphire), Vert (emerald), Gules (ruby), Sable (onyx).
