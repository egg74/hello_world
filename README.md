# Backstage Pass

A turn-based, card-based band management game. Manage your band between gigs,
build hype with prep cards, then take the stage and play performance cards to
win over the crowd — all while keeping band harmony from falling apart.

## Stack

React + TypeScript + Tailwind CSS, state managed with Zustand, icons from
lucide-react.

## Running locally

```bash
npm install
npm run dev
```

## Scripts

- `npm run dev` – start the Vite dev server
- `npm run build` – type-check and build for production
- `npm run lint` – run ESLint
- `npm run preview` – preview the production build

## Game loop

1. **Management** – view the band, book a gig at a venue, or rest to restore
   band harmony.
2. **Gig Prep** – play prep cards (cost cash) to bank starting hype before the
   show.
3. **Gig Live** – each turn, spend energy playing performance cards to build
   hype toward the venue's requirement. Drama cards can appear and must be
   resolved, usually at a cost to band harmony or a member's ego.
4. **Gig Summary** – see the payout and new fans earned, then head back to
   Management for the next day.

The band breaks up if harmony hits 0, and you win once total fans reach the
fame goal.
