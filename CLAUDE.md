# CleverProfits Tools — Design System Foundation

> Last updated: 2026-04-29
> North Star: **"Turn operational chaos into a visible, intelligent system."**

---

## Source of Truth

This document defines **product-level** decisions for tools.cleverprofits.com — north star, audience, philosophy, motion behavior, UX principles, architecture. It does **not** define brand tokens.

For colors, typography, spacing, shadows, radii, and component specs:

| Layer | File | Role |
|---|---|---|
| Brand kit | `~/.claude/skills/cleverfy-v3/clever-brand-kit.md` | Canonical source for every brand token — colors, typography, shadows, components |
| Tailwind config | `tailwind.config.ts` | Live runtime mapping of brand tokens (`cp-*`, `brand-*`, `shadow-card`, `font-display`, etc.) |
| This file | `CLAUDE.md` | Product behavior + decisions specific to this platform |

**Rule:** never hardcode hex values, font names, or shadow recipes here. If a brand value needs to change, update it in the brand kit (and propagate to `tailwind.config.ts`); CLAUDE.md should not need to change.

If this platform overrides a brand value (e.g., a custom token, a local exception), document the override + reason here — but reference the brand kit token it diverges from.

---

## Design System Override — Stitch "Kinetic Editor"

**Decision (2026-04-29):** This platform adopts Google Stitch's "Kinetic Editor" **structural** philosophy — surface tiers, no-line containment, asymmetric editorial layouts, tonal layering, hero gradient, card radii. The brand kit at `~/.claude/skills/cleverfy-v3/clever-brand-kit.md` remains the source of truth for **brand colors AND typography** (Inter display + DM Sans body — preserved).

**Reference materials:** `~/tools-platform/.design-references/stitch/`
- `DESIGN.md` — the Kinetic Editor specification
- `screen.png` — visual target
- `code.html` — Stitch's HTML reference

### What overrides Stitch (brand kit wins)

| Token | Brand kit value | Stitch default (replaced) |
|---|---|---|
| `primary` | `#0F0038` Royal Blue | `#1800b0` |
| `primary-container` | `#2605EF` Electric Blue | `#2605ef` (incidental match) |
| `error` | `#DC2626` | `#ba1a1a` |
| `success` | `#10B981` | (Stitch has none) |
| `warning` | `#F59E0B` | (Stitch has none) |

### What overrides the brand kit (Stitch wins)

| Concern | Stitch | Brand kit (set aside) |
|---|---|---|
| Surface tiers | M3-style: `surface`, `surface-container-low/lowest/high/highest`, `surface-bright` | flat `cp-surface` / `cp-background` |
| Containment | **No-line rule** — boundaries via tonal shifts only, never 1px borders | varied |
| Elevation | **Tonal layering** (stacking surface tiers) > shadows | shadows |
| Card radius | `rounded-[2rem]` (= `rounded-4xl`) for hero/feature cards | `rounded-2xl` |
| Section gaps | `spacing-20` (5rem) / `spacing-24` (6rem) | varied |
| Hero gradient | 135° `primary → primary-container` | shadows + flat fills |
| Letter-spacing scale | Editorial: `-0.04em`/`-0.03em`/`-0.02em` for display, `0.18em` for micro-labels | varied |

**Note on typography:** Stitch DESIGN.md specifies Space Grotesk (display) + Inter (body). This platform deliberately keeps the brand kit's Inter (display) + DM Sans (body) instead — brand identity ranks higher than Stitch's typographic voice for an internal CleverProfits product.

### Why this divergence

The brand kit is excellent for marketing surfaces and KPI dashboards (data-dense, table-heavy). The internal tools platform is editorial — it tells a story about a living ecosystem. The Kinetic Editor's asymmetric layouts, expansive negative space, and tonal layering match this product's "living system" north star better than a card-everything dashboard pattern would. Brand identity is preserved through color (Royal Blue + Electric Blue are still the soul); only the structural philosophy shifts.

### Where the override is wired

- **`app/layout.tsx`** — Inter + DM Sans (brand kit, unchanged). Variables: `--font-inter`, `--font-dm-sans`.
- **`tailwind.config.ts`** —
  - `font-display` → Inter; `font-sans` → DM Sans (brand kit, unchanged)
  - Stitch surface tier tokens added at exact Stitch values: `surface`, `surface-bright`, `surface-dim`, `surface-variant`, `surface-container-{lowest,low,,high,highest}`, `outline`, `outline-variant`, `on-surface`, `on-surface-variant`, `inverse-surface`, `inverse-on-surface`
  - `primary`/`primary-container`/`secondary`/`tertiary` exposed as Stitch-compatible tokens, but `primary` and `primary-container` remapped to brand Royal Blue / Electric Blue
  - Functional palette (`error`, `success`, `warning`) from brand kit
  - `rounded-4xl: 2rem` added for Stitch hero/feature cards
  - `shadow-tonal`, `shadow-tonal-lg`, `shadow-tonal-xl` — Stitch tertiary-tinted ambient shadows for floating elements
  - `bg-kinetic-gradient` — 135° Royal Blue → Electric Blue (Stitch hero gradient)
  - `backdropBlur.glass: 20px` (Stitch glassmorphism)
  - `letterSpacing.{tightest,extra-tight,editorial,wider,widest}` (Stitch editorial scale)
- **`app/globals.css`** — unchanged; `h1-h6` stay on `--font-inter` per brand kit.

### How to apply this in components

When building a new component or refactoring an existing one:

1. **Containment:** never use `border` for sectioning. Define boundaries with `bg-surface-container-low` against `bg-surface`, etc.
2. **Cards:** `bg-surface-container-lowest` (white), `rounded-2xl` or `rounded-4xl` for hero, `p-6` to `p-8` internal, `shadow-card` only if a soft lift is required — prefer tonal layering instead.
3. **Display headlines:** `font-display` (Inter, brand kit), `tracking-[-0.02em]` to `tracking-[-0.04em]`, `leading-none` to `leading-tight`.
4. **Labels:** `text-[10px]` or `text-[11px]`, `uppercase`, `tracking-[0.18em]`, often paired with `text-primary` color to act as a "Technical Header" marker above a display headline.
5. **Section gaps:** `mb-20` (5rem) or `mb-24` (6rem). Smaller gaps look templated.
6. **Hero/CTA gradient:** `bg-kinetic-gradient` (or `bg-gradient-to-br from-primary to-primary-container`).

---

## What We're Building

CleverProfits Tools is an **internal operational intelligence platform** — not a tool list, not a dashboard, but a living ecosystem where every internal tool has an identity, owner, purpose, and lifecycle. It transforms scattered internal tools into a structured, discoverable, and governable system.

The central abstraction is the **Tool** — an entity with context, purpose, ownership, access level, and status. Not just a link.

---

## Audience

**Primary**: CleverProfits employees — non-technical. They should never see infrastructure, code, or complexity. The platform should feel as obvious as opening an app on their phone.

**Secondary**: Admins (ADMIN / SUPER_ADMIN) — manage governance, approvals, user access. They need power without ceremony.

**Persona snapshot**:
- Not a developer. Doesn't know what a slug is.
- Finds tools by name or team, not by remembering URLs.
- Trusts a platform that "just knows" — autocomplete, smart defaults, zero jargon.
- Abandons anything that feels like a form or a spreadsheet.

---

## Design Philosophy — Three Principles

### 1. Extreme Simplicity
Nothing technical, heavy, or intimidating. Every interaction should feel obvious, light, and almost automatic. If the user has to think, the design failed.

### 2. Living System
This is not a static registry. Tools have a lifecycle: born, active, growing, stale, archived. The design should express this aliveness — motion that suggests activity, states that tell stories, space that breathes.

### 3. Organizational Clarity
Everything in the company can be located, understood, and evaluated at a glance. Hierarchy, access, team — visible at a glance, never buried.

---

## Central Metaphor: Bubbles

Bubbles are **structural**, not decorative.

Each tool = a bubble in a living system:
- **Size** → impact or usage volume
- **Proximity** → relationship or dependency between tools
- **Movement** → activity (or lack of it)
- **Opacity/color** → status or access level

Goal: move from a "list of tools" model toward a **visual map of operational intelligence**.

Current implementation: bubbles animate in the sidebar as ambient life. Future: bubble-based tool visualization in Insights/Analytics.

---

## Personality

**Three words**: **Intelligent · Light · Alive**

The product speaks as an **operational assistant** — not a technical tool.
- Clear, direct, zero jargon
- Confident but not arrogant
- Feels like it understands you

**Voice examples**:
- ❌ "Submit tool for approval" → ✅ "Add your tool — we'll handle the rest"
- ❌ "No results found" → ✅ "No tools match your filters"
- ❌ "Error: unauthorized" → ✅ "This tool is restricted to leadership"

---

## Visual Language

### Feeling
- Premium but not complex
- Minimalist but not empty
- Technological but human

### Surfaces (product behavior — values from brand kit)
- **Page background**: subtle dot-grid texture over the brand kit's background token
- **Sidebar**: solid Royal Blue from the brand kit — the "soul" of the platform
- **Cards/panels**: surface token from the brand kit, navy-tinted shadows from the brand kit's shadow scale
- **Hero**: `bg-hero-mesh` (defined in `app/globals.css`) — dark radial mesh that bleeds to the sidebar

### Typography
The brand kit specifies Inter (display) + DM Sans (body); this project follows the brand kit. Loaded via `next/font/google` in `app/layout.tsx`, exposed as `--font-inter` / `--font-dm-sans`, mapped to Tailwind's `font-display` / `font-sans` in `tailwind.config.ts`.

Project-specific notes:
- **Body weight**: never 500+ in DM Sans — it bleeds into Inter's visual territory. Stick to 400.
- **Display tracking**: `-0.02em` standard, tighten to `-0.04em` for hero headlines (Stitch editorial density)
- **Scale principle**: meaningful jumps between levels (skip steps, not increments)

### Color
All color tokens live in the brand kit and are exposed as Tailwind classes via `tailwind.config.ts` (`cp-*`, `brand-*`).

Project-specific color rules:
- **Per-tool accent**: hashed from tool name → 10-color palette (blue, violet, emerald, amber, rose, sky, orange, teal, pink, indigo). This is a product decision, not a brand decision.
- **Functional state mapping**: ACTIVE = emerald, PENDING = amber, REJECTED = red, ARCHIVED = neutral grey. Functional borders use Tailwind's `emerald-*`/`amber-*` ramps; primaries use the brand kit's functional hex values.

### Shape Language (product convention)
- `rounded-2xl` for cards, panels, modals (16px in this project's Tailwind config — matches brand kit "Standard Card" radius)
- `rounded-lg` for buttons, nav items, small containers
- `rounded-md` for badges and chips
- `rounded-full` only for avatars, dot indicators, and pills

---

## Motion & Interaction

The system should feel alive, but controlled. Transition durations and easings come from the brand kit's transition scale; the table below documents *which behavior* applies *where* in this product.

| Trigger | Response |
|---------|----------|
| Hover card | Subtle lift (`-translate-y-1`) + shadow deepens (`shadow-card` → `shadow-card-hover`) |
| Hover list row | Background tint + accent bar intensifies to 100% |
| Active nav item | `bg-white/[0.15]` + left accent pill |
| Page load | `fade-up` keyframe (defined in `tailwind.config.ts`) with staggered delays |
| Bubble animation | `bubble-rise` — translateY -96vh, 8–16s cycle, ease-in-out |
| Mouse in sidebar | Radial spotlight follows cursor |
| Filter toggle | Collapsible row — no layout shift |

**Reduced motion**: All animations disabled via `prefers-reduced-motion` media query.

---

## UX Principles

1. **Zero-friction onboarding** — User starts something, system completes it
2. **Progressive disclosure** — Show less, expand on demand (e.g., collapsible filters)
3. **Explain without teaching** — User understands without needing to know how it works
4. **Immediate feedback** — Every action has a visible, clear response
5. **Perceived intelligence** — Autocomplete, smart defaults, reduce decisions

---

## Conceptual Architecture

| Layer | Route | Purpose |
|-------|-------|---------|
| Creation | `/dashboard/register` | Tools are born — minimum input, system does the rest |
| Discovery | `/dashboard`, `/dashboard/my-tools` | Tools are explored — visual, fast, understandable |
| Intelligence | `/dashboard/admin/insights`, `/analytics` | Patterns are understood — what works, what doesn't |
| Governance | `/dashboard/admin/tools`, `/users`, `/audit` | Control and scale — no friction, but with clarity |

---

## Technical Constraints

- **Framework**: Next.js 14 App Router (Server + Client Components)
- **Styling**: Tailwind CSS v3
- **Auth**: next-auth v4, Google OAuth, JWT strategy, `@cleverprofits.com` domain only
- **DB**: Prisma 5 + PostgreSQL (Railway)
- **Fonts**: `next/font/google` — Inter (headers + UI labels) + DM_Sans (body, weight 400/500)
- **RBAC**: SUPER_ADMIN / ADMIN / BUILDER / VIEWER
- **Proxy**: Internal tools served via `app/[slug]/[[...path]]/route.ts`
- **Accessibility**: `:focus-visible` ring everywhere, `aria-hidden` on decorative elements, `prefers-reduced-motion` respected

---

## What This Should NOT Feel Like

- A spreadsheet with styling
- A developer tool (no exposed slugs, no technical jargon in UI copy)
- Generic SaaS dashboard (no purple-gradient-on-white, no card-everything, no anonymous system fonts)
- Anything that requires a manual or onboarding tour to understand

---

## Suggested Next Steps

- `/cleverfy` — Re-run brand verification any time `tailwind.config.ts` or the brand kit is updated
- `/animate` — Formalize the motion system and add missing interaction states
- `/overdrive` — Explore the bubble metaphor as a visual tool map (Insights page)
- `/onboard` — Design the Register Tool flow to match zero-friction principle
