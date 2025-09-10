# UI Design System

Goal: Calm, modern, bespoke. No default AI template vibes. Light and Dark themes with Teal (primary) and Amber (secondary) accents.

## Tokens (CSS variables)
Root tokens live in styles/tokens.css (to be created in Phase 1). Tailwind will reference these via theme.extend.

Color palette (WCAG AA or better):
- Base surface: light: hsl(210 20% 99%), dark: hsl(210 14% 10%)
- Text: light: hsl(220 15% 15%), dark: hsl(210 20% 96%)
- Border: light: hsl(210 16% 90%), dark: hsl(210 10% 25%)
- Accent Primary (Teal): light: hsl(170 70% 40%), dark: hsl(170 70% 50%)
- Accent Secondary (Amber): light: hsl(38 90% 50%), dark: hsl(38 90% 55%)
- Muted: light: hsl(210 16% 96%), dark: hsl(220 10% 16%)

Radii: 8px, 14px, 22px
Shadow: 0 1px 1px hsl(0 0% 0% / 0.04), 0 8px 24px hsl(0 0% 0% / 0.08)
Focus ring: 2px solid var(--accent)

Spacing: 8-pt scale
Content max width: 980px

Motion (Framer Motion defaults):
- Page transition: fade + 8px slide, duration 0.16–0.18s, ease cubic-bezier(0.22, 1, 0.36, 1)
- Card hover: translateY(-2px) + subtle shadow
- Checkmark pop: scale 0.96 → 1.02 → 1
- Respect prefers-reduced-motion: reduce durations to 0 and remove movement

## Components
- Header: brand, theme toggle, minimal actions
- OutlineList: collapsible, keyboard navigable, aria-expanded
- DocCard: document preview with subtle motion and metadata
- ExportBar: Copy and Download buttons with progress/toast
- Skeletons: neutral blocks; avoid spinners where possible
- DevPanel: toggles for outline debug and LLM assist

## Typography
- System UI stack or Inter (fallback safe). Sizes responsive but restrained.
- Title case rules only for headings; body uses sentence case.

## Do/Don’t
- Do: solid surfaces, crisp borders, ample whitespace
- Don’t: glassmorphism, neon gradients, heavy drop shadows, parallax

