# CleverProfits Tools — Design System Foundation

> Last updated: 2026-03-24
> North Star: **"Turn operational chaos into a visible, intelligent system."**

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

### Surfaces

- **Background**: `#EEF2FB` with subtle dot-grid texture
- **Sidebar**: `#040B4D` deep navy — the brand's "soul"
- **Cards/panels**: white (`#FFFFFF`) with `rgba(4,11,77,x)` navy-tinted shadows
- **Hero**: `bg-hero-mesh` — dark navy radial mesh, bleeds to the sidebar

### Typography — Tools Platform Spec

- **Headers (h1–h6)**: **Inter** Bold — `letter-spacing: -0.02em`, `line-height: 1.2`
- **Body / content**: **DM Sans** Regular (400 only — never 500+, bleeds into Inter territory)
- **Small UI labels / table headers**: **Inter** Medium 500 — `font-size: 0.75rem`, `letter-spacing: 0.03em`
- Note: aligned with brand design system — Inter for display/UI labels, DM Sans for body
- Scale principle: meaningful jumps between levels (skip steps, not increments)

### Color System

- `#040B4D` — Royal Blue (primary surface, deepest brand)
- `#2605EF` — Electric Blue (primary action, active states, accent)
- `#EEF2FB` — Background (light, blue-tinted — not pure white)
- `#D5D4FF` — Brand 100 (soft highlight, selection states)
- Per-tool accent colors: hashed from tool name → 10-color palette (blue, violet, emerald, amber, rose, sky, orange, teal, pink, indigo)
- Functional: emerald (active), amber (pending), red (error/rejected), slate (archived)
- **All shadows**: navy-tinted `rgba(4,11,77,x)` — never pure black

### Shape Language

- `rounded-xl` for cards, panels, modals
- `rounded-lg` for buttons, nav items, small containers
- `rounded` for badges and chips
- `rounded-full` only for avatars and dot indicators

---

## Motion & Interaction

The system should feel alive, but controlled.

| Trigger          | Response                                                   |
| ---------------- | ---------------------------------------------------------- |
| Hover card       | Subtle lift (`-translate-y-1`) + shadow deepens            |
| Hover list row   | Background tint + accent bar intensifies to 100%           |
| Active nav item  | `bg-white/[0.15]` + left accent pill                       |
| Page load        | `fade-up` (0.35s ease) with staggered delays               |
| Bubble animation | `bubble-rise` — translateY -96vh, 8–16s cycle, ease-in-out |
| Mouse in sidebar | Radial spotlight follows cursor                            |
| Filter toggle    | Collapsible row — no layout shift                          |

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

| Layer        | Route                                        | Purpose                                              |
| ------------ | -------------------------------------------- | ---------------------------------------------------- |
| Creation     | `/dashboard/register`                        | Tools are born — minimum input, system does the rest |
| Discovery    | `/dashboard`, `/dashboard/my-tools`          | Tools are explored — visual, fast, understandable    |
| Intelligence | `/dashboard/admin/insights`, `/analytics`    | Patterns are understood — what works, what doesn't   |
| Governance   | `/dashboard/admin/tools`, `/users`, `/audit` | Control and scale — no friction, but with clarity    |

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

- `/color` — Formalize the full color system (functional + semantic tokens)
- `/fonts` — Audit Space Grotesk + Inter sizing scale across all components
- `/animate` — Formalize the motion system and add missing interaction states
- `/overdrive` — Explore the bubble metaphor as a visual tool map (Insights page)
- `/onboard` — Design the Register Tool flow to match zero-friction principle
