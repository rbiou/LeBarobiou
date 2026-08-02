# AGENTS.md

Guidance for AI coding tools working on this repository. Follow this document as closely as possible; it describes project intent and conventions, not guaranteed runtime behavior.

## Project overview

LeBarobiou is a front-end web app for viewing data from a configurable personal weather station. The station exposes data through the Weather Underground API.

The app is used mainly on mobile and tablet, and sometimes on desktop. There is no user account or multi-step flow: open the page, see live and historical weather data, and adjust display settings (including the forecast model).

**Stack**

- JavaScript, React
- Vite, Tailwind CSS, Recharts
- PWA (installable web app)
- No backend database
- Hosted on GitHub Pages (Docker/Nginx is also supported for deployment)

**Main capabilities**

- Live weather metrics (temperature, humidity, pressure, wind, rain, etc.), refreshed periodically
- History for the last 30 days
- Configurable dashboard layout and forecast model
- Weather Underground API integration (`src/api/weather.js`, and related API modules)

**Key paths**

- `src/App.jsx` — main dashboard
- `src/components/` — UI blocks and cards
- `src/api/` — external API clients
- `src/context/` — app settings and theme
- `public/` — static assets and PWA manifest
- `.github/workflows/deploy.yml` — GitHub Pages deployment

## Build and test commands

Requires Node.js 18+ (20 recommended).

Set environment variables before building or running locally:

```bash
export VITE_WU_API_KEY="your_api_key"
export VITE_WU_STATION_ID="your_station_id"
```

Vite exposes variables prefixed with `VITE_` to the frontend at build time.

**Install dependencies**

```bash
npm install
```

**Run locally**

```bash
npm run dev
```

**Production build**

```bash
npm run build
```

**Preview production build**

```bash
npm run preview
```

**Deploy to GitHub Pages**

```bash
npm run deploy
```

**Docker (optional)**

```bash
docker build -t meteo-dashboard .
docker run -d -p 80:80 meteo-dashboard
```

CI on push to `main` runs `npm ci`, injects secrets for the build, then deploys `dist/` to GitHub Pages.

## Code style

No project-specific style tooling is configured yet. When adding or changing code, prefer conventional patterns for a small React + Vite app:

- Use functional React components and hooks
- Keep API calls in `src/api/`, reusable UI in `src/components/`, shared helpers in `src/utils/`
- Match existing file naming in each folder (currently mostly `.jsx` for components)
- Use Tailwind utility classes for styling; follow patterns already used in nearby components
- Prefer small, focused changes over broad refactors
- Keep comments brief and only where logic is non-obvious

**Not yet configured — use standard defaults when introducing tooling**

- Formatter: Prettier with a typical React/Vite setup
- Linter: ESLint with recommended React and hooks rules
- Language for code, UI copy, and commit messages: not formally defined yet; stay consistent with surrounding files

When in doubt, mirror the style of the file you are editing.

## Agent skills

Read and apply the relevant Cursor skill **before** starting work in that area. Use the skill that best matches the task; combine skills when a change spans UI, React perf, and browser verification.

| Skill | Use when |
|---|---|
| `web-design-guidelines` | Building or reviewing UI/UX, accessibility, layout, touch targets, or visual polish |
| `vercel-react-best-practices` | Writing or refactoring React components, data fetching, bundle size, or render performance |
| `vercel-react-view-transitions` | Adding or improving page/state transitions and motion between views |
| `shadcn` | Adding UI components, migrating toward shadcn/ui, or composing standard reusable building blocks |
| `playwright` | Automated browser checks, CLI-driven navigation, or repeatable UI verification |
| `playwright-interactive` | Iterative in-browser debugging of UI flows and responsive behavior |

**Component direction:** the target stack is **shadcn/ui on Tailwind**, not one-off custom widgets. Prefer shadcn primitives and shared project components over new bespoke markup. shadcn is not initialized yet (`components.json` missing) — introduce it incrementally when adding or refactoring UI.

## Design & UI

Follow these guidelines for new screens and refactors. Match existing patterns in `src/components/`, `src/index.css`, and `tailwind.config.js` unless migrating them to the standards below.

### Layout & devices

- **Mobile-first** is mandatory
- **Tablet is a priority** breakpoint — optimize card density, spacing, and chart readability for tablet widths
- **Desktop** should remain usable with a strong layout (multi-column where helpful), but never at the expense of mobile/tablet
- Use responsive Tailwind breakpoints; avoid desktop-only layouts or hover-only critical actions

### Look & feel

- Clean **weather dashboard**: readable data first, calm surfaces, clear hierarchy
- **Modern** card-based UI with soft shadows and rounded corners
- **Dark mode** supports subtle neon accents on primary/data highlights (see existing CSS variables)
- Preserve and extend **PWA-native interactions**: pull-to-refresh, swipeable tabs, install prompt, full-screen mobile usage

### Color & typography (recommended direction)

The current slate + sky palette is a reasonable base. For a weather dashboard, prefer **token-based semantic colors** over hard-coded Tailwind shades in components:

| Role | Recommendation | Notes |
|---|---|---|
| Surfaces | `zinc` or `slate` neutrals | light: soft gray background; dark: elevated cards |
| Primary / brand | `cyan` / `sky` | links, focus, primary actions, “live” states |
| Temperature | `amber` → `orange` | warm readings, highs |
| Humidity / rain | `sky` / `blue` | water-related metrics |
| Wind | `indigo` / `slate` | neutral-cool accent |
| Positive trend | `emerald` | rising favorable metrics |
| Negative / alert | `rose` / `amber` | drops, warnings, extremes |

**Typography:** prefer a single sans family across the app. **Inter** (already configured) is fine. Alternatives if refreshing the brand: **DM Sans** or **Plus Jakarta Sans** — both stay highly readable on small screens.

Define colors as CSS variables / Tailwind tokens in `src/index.css` and `tailwind.config.js`. Do not scatter raw color utilities (`bg-blue-500`, etc.) in feature components.

### Icons

- Today: `react-icons` (Weather Icons + Heroicons)
- **Direction:** move toward a **single mainstream icon set** used app-wide — **Lucide** is the best fit alongside shadcn/ui
- Keep weather-specific icons only where a generic icon is unclear; otherwise standardize on one library

### Charts

- Use **Recharts** for time-series and weather history (already used in `src/components/WeatherChart.jsx`)
- Keep charts responsive (`ResponsiveContainer`), theme-aware (light/dark tooltip/grid colors), and touch-friendly on mobile/tablet
- Reuse existing chart interaction patterns (range tabs, legend toggles, fullscreen) before inventing new ones

### Language (i18n)

- **French is the default UI language**
- i18n is implemented in `src/utils/i18n.js` with strings accessed via `useSettings()` → `t('key')`
- Add new user-facing copy as translation keys in `fr` (and `en` when English is supported); do not hard-code French/English strings in components

### Reusable components (strong rule)

- Maximize **standard, reusable, composable components** to limit style drift and component sprawl
- Prefer shared primitives under `src/components/ui/` and shadcn components over duplicated markup
- New UI should extend existing blocks (`WeatherCard`, `SwipeableTabs`, `PullToRefresh`, etc.) or replace them via migration — not parallel one-offs
- Variants and layout props are preferred over copying a component to change styling

**Avoid**

- Heavy UI libraries beyond Tailwind + shadcn
- One-off colors, spacing, or button styles outside shared tokens/components
- New icon libraries without consolidating existing usage
- Desktop-only feature discovery (hidden mobile paths)

## Testing instructions

Automated tests and lint/format scripts are **not set up yet**.

When adding them, use a basic standard setup for this stack:

- Test runner: Vitest (fits Vite projects well)
- Component tests: React Testing Library, only where behavior is non-trivial
- Suggested scripts to add later: `npm test`, `npm run lint`, `npm run format`

Until those exist, manually verify changes:

1. Run `npm run dev` and check the dashboard on mobile-width and desktop-width viewports
2. Confirm live data still loads when valid `VITE_*` env vars are present
3. Run `npm run build` and ensure the build succeeds before deployment-related changes

Do not add large test suites for trivial UI unless requested.

## Git workflow

Use a simple standard workflow:

- `main` is the production branch; pushes trigger GitHub Pages deployment
- Create a short-lived branch for non-trivial work (`feature/...`, `fix/...`)
- Open a pull request when useful for review; small fixes may go directly to `main` if that matches current practice
- Keep commits focused and descriptive
- Do not commit generated artifacts (`dist/`) unless the repo already does so intentionally
- **Never attempt large refactors in a single pass.** Prefer small, reviewable increments: several focused commits, multiple PRs, and changes that are easy to review.

No special branching rules beyond this are defined.

## Security considerations

Treat the following as sensitive:

- `.env` — contains personal test weather-station credentials (`VITE_WU_API_KEY`, `VITE_WU_STATION_ID`)
- GitHub Actions secrets used in `.github/workflows/deploy.yml`

**Rules for agents**

- Never commit, print, log, or paste `.env` contents into code, docs, issues, or chat output
- Never hard-code API keys or station IDs in source files
- Do not expose personal station data in public artifacts
- Prefer env vars and existing CI secret injection for builds
- Ask before changing deployment secrets, GitHub Actions secret usage, or production hosting configuration

If you need env values to test locally, assume the developer will provide them outside the repository.

## Known gaps

These areas are intentionally minimal today. Do not invent project-specific rules for them:

- Automated tests
- ESLint / Prettier configuration
- shadcn/ui initialization (`components.json`, shared primitives)
- Icon library consolidation (migration from mixed `react-icons` usage to a single set)
- Formal commit-message convention
- Documented onboarding pitfalls (none reported so far)

When extending the project in these areas, keep solutions simple and conventional for React + Vite.
