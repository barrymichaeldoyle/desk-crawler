# Bag slots and sheets (D98) — 2026-10-08

Scope: the companion Bag page only. No template, simulator or balance change. The backend's `inventory.mine` gains one additive field, `templateId`, so the companion can draw each piece.

What changed:

- Gear is drawn in slots: a grid of the bag's capacity with each piece's icon (`packages/desk-crawler/src/art/items.ts`, one 16x16 sprite per gear template in every catalog) inside its rarity edge, with an upgrade arrow, level lock, selection tick and busy dither in the corners. Equipped pieces and the potion stack sit above in their own slots.
- A piece's details and actions open in a native `<dialog>` drawn as a bottom sheet on phones. The sale review is a second sheet. The page behind never reflows while a sheet is open.
- Sell gear turns the grid into a selection with a pinned bar (count, gold, rare count, Sell) and Select all; Done leaves. One piece can be sold from its sheet.
- Feedback moves out of the flow into a pinned notice; errors raised inside an open sheet show in that sheet. Only the acting slot shows busy, instead of every Equip button reading "Equipping…".
- Unavailable actions (paused, travelling, quarantined, level too low, bag full for a claim) are explained in the sheet with the control disabled, instead of dashing every control on the page.

Verification:

- `pnpm check` and `pnpm build` pass with the new `tests/web/bag-slots.test.ts` (icon coverage for every catalog's gear templates, 16x16 padding, crisp two-fill rendering, slot and sheet semantics).
- Signed-in development deployment, desktop Chrome: equip from a sheet (slot swapped, notice shown, no reflow), sell mode with two pieces, review sheet, confirmed sale (bag went from 8 of 6 to 6 of 6, sell mode left, notice shown). The dev hero was released from its BAG_FULL quarantine and resumed from its paused state for this check; those are dev-data actions.
- Synthetic QA (`tools/review/companion-fixtures.mjs`, fictional data, mutations fail after a short delay) at 390x844 and 1280x900 through playwright-core: browse with a full 30-slot bag, item sheet, sell mode with three selections, review sheet, pending and failed confirmation inside the sheet, cancel, held find with a sleeping hero and an open merchant, equipped and potion sheets, paused hero, desktop Select all capped at 30. No console errors, no horizontal overflow.

Not covered: a real phone or screen reader; the sheet's focus return was checked through the browser's own dialog behaviour, not a device.
