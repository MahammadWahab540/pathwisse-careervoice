# CareerVoice Unified Design System (v2.0)
**Document Owner:** Agent A2 (Design System Agent)  
**Approved by:** Agent A0 (Principal Product Engineer & Orchestrator)  
**Status:** Frozen & Canonical  

---

## 1. Design Philosophy: The CareerVoice Aesthetic

The CareerVoice visual language is anchored in **editorial warmth, human authority, and modern B2B SaaS clarity**.
It avoids generic cold dark-mode themes or sterile generic blue dashboards in favor of:

1. **Warm Cream Canvas:** Ambient, organic feel that reduces evaluation anxiety for students (`#f6f0e7`, `#fffdf9`).
2. **Pathwisse Orange Accent:** High-energy, optimistic signal of growth and momentum (`#f57c00`, `#ffad38`, `#ef4b36`).
3. **Deep Navy Authority:** Grounding serious data surfaces, high-contrast tables, and executive metrics (`#0f172a`, `#1f3861`, `#334155`).
4. **Subtle Elevation & Soft Geometries:** Organic `22px` and `16px` border radii, micro-borders (`#e9e2d8`, `#e2e8f0`), and soft ambient shadows.

---

## 2. Color Palette & Token Hierarchy

```css
:root {
  /* Ambient Canvas & Surfaces */
  --cv-bg: #f6f0e7;            /* Primary ambient cream background */
  --cv-panel: #fffdf9;         /* Elevated editorial card / shell */
  --cv-surface: #ffffff;       /* Pure white operational surface */
  --cv-surface-subtle: #f8fafc;/* Table header / muted container */

  /* Lines & Borders */
  --cv-border: #e9e2d8;        /* Warm border line */
  --cv-border-subtle: #f1ede6; /* Light separator */
  --cv-border-slate: #e2e8f0;  /* Operational table/card border */

  /* Typography Colors */
  --cv-text-primary: #171717;  /* High-contrast slate/black headline */
  --cv-text-secondary: #475569;/* Body text & labels */
  --cv-text-muted: #77736d;    /* Supporting metadata & placeholders */
  --cv-text-navy: #0f172a;     /* Executive authority headers */

  /* CareerVoice Signature Accents */
  --cv-orange: #f57c00;        /* Core brand accent */
  --cv-orange-light: #ffad38;  /* Highlight & gradient stop */
  --cv-orange-soft: #fff2df;   /* Light tinted pill & highlight background */
  --cv-red: #ef4b36;           /* Attention / alert */
  --cv-navy: #1f3861;          /* Serious data & active nav state */
  --cv-navy-deep: #0f172a;     /* High-contrast metrics */

  /* Semantic State Colors */
  --cv-success: #16a34a;       /* Completed / strong signal */
  --cv-success-soft: #f0fdf4;
  --cv-info: #2563eb;          /* In progress / started */
  --cv-info-soft: #eff6ff;
  --cv-warning: #d97706;       /* Attention required / medium signal */
  --cv-warning-soft: #fffbeb;
  --cv-danger: #dc2626;        /* High gap / alert */
  --cv-danger-soft: #fef2f2;

  /* Shadows */
  --cv-shadow-sm: 0 1px 3px rgba(47, 33, 12, 0.05);
  --cv-shadow-md: 0 4px 16px rgba(47, 33, 12, 0.06);
  --cv-shadow-lg: 0 20px 48px rgba(47, 33, 12, 0.10);
  --cv-shadow-card: 0 10px 30px rgba(0, 0, 0, 0.04);
}
```

---

## 3. Typography Scale

CareerVoice uses the native system font stack prioritizing clarity and fast rendering:
`font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;`

- **Display 1 (Hero/Welcome):** `text-3xl font-extrabold tracking-tight text-[#171717]` (30px / 36px)
- **Section Heading:** `text-xl font-bold tracking-tight text-[#0f172a]` (20px / 28px)
- **Card Title:** `text-base font-bold text-[#171717]` (16px / 24px)
- **Body Regular:** `text-sm font-normal text-[#475569] leading-relaxed` (14px / 20px)
- **Caption / Meta:** `text-xs font-semibold text-[#77736d] uppercase tracking-wider` (12px / 16px)
- **Metric Big Stat:** `text-3xl sm:text-4xl font-black text-[#0f172a] tracking-tight`

---

## 4. Reusable Primitives (`src/components/ui/`)

All agents MUST import and use these shared components. Page-level custom implementations of these elements are strictly forbidden.

1. **`Button` (`Button.tsx`)**:
   - `variant`: `'primary'` (gradient orange), `'navy'` (deep navy solid), `'outline'` (bordered neutral), `'ghost'` (subtle hover), `'danger'` (soft red).
   - `size`: `'sm'`, `'md'`, `'lg'`.
   - `isLoading`: Shows smooth spinner with disabled state.
2. **`Input` (`Input.tsx`)**:
   - Integrated label, hint, error text, prefix icon, and disabled states.
   - Warm focus ring: `focus:border-[#f57c00] focus:ring-2 focus:ring-[#f57c00]/15`.
3. **`Select` (`Select.tsx`)**:
   - Stylized native select matching input geometry.
4. **`Card` (`Card.tsx`)**:
   - Elevated editorial container: `bg-white border border-[#e2e8f0] rounded-2xl shadow-sm hover:shadow-md transition-shadow`.
   - Sub-components: `CardHeader`, `CardTitle`, `CardDescription`, `CardContent`, `CardFooter`.
5. **`Badge` (`Badge.tsx`)**:
   - Semantic pills: `'success'` (green), `'info'` (blue), `'warning'` (amber), `'danger'` (red), `'slate'` (neutral).
6. **`Table` (`Table.tsx`)**:
   - Responsive horizontal scroll wrapper with subtle striped hover rows and sticky header support.
7. **`Modal` (`Modal.tsx`)**:
   - Accessible animated modal overlay with click-outside and `Escape` key listeners.
8. **`EmptyState` (`EmptyState.tsx`)**:
   - Icon, title, description, and primary CTA.
9. **`LoadingState` (`LoadingState.tsx`)**:
   - Consistent spinner and skeletal loading cards.
10. **`ErrorState` (`ErrorState.tsx`)**:
    - User-friendly error message with retry button.

---

## 5. Shared Layouts (`src/layouts/`)

### 1. `AuthLayout.tsx`
- Used by: `/login`, `/verify`, `/invite/:token`, `/onboarding/role`, `/onboarding/student`, `/onboarding/placement`.
- Warm editorial split screen:
  - Responsive container centered or split into form + visual showcase.
  - Background: `bg-[#f6f0e7]` with ambient glow.

### 2. `StudentLayout.tsx`
- Used by: `/student`, `/student/assessment`, `/student/result/:assessmentId`.
- Minimalist focused top navigation:
  - Pathwisse CareerVoice logo.
  - Student identity chip (Name + Department).
  - Clean Sign Out CTA.
  - Max-width content container (`max-w-5xl mx-auto px-4 sm:px-6 py-6`).

### 3. `PlacementLayout.tsx`
- Used by: All `/placement/*` routes.
- Dual-tier layout:
  - Persistent left sidebar with institutional identity, verified placement cell, active batch filter, and target navigation items:
    - `Overview`
    - `Campaigns`
    - `Students`
    - `Reports`
    - `Insights`
    - `Messages`
    - `Settings`
    - Divider
    - `Pathwisse Core ↗` (external link)
  - Top bar with institutional context, notifications, and user profile / logout menu.
  - Responsive mobile drawer menu.
