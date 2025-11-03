# Repository Guidelines

## Project Structure & Module Organization
- `app/`: Next.js App Router entry points (`page.tsx`, `layout.tsx`) and global styles (`globals.css`).
- `public/`: Static assets served at the root (e.g., `/next.svg`).
- `types/`: Generated and shared TypeScript types; do not edit generated files.
- Config: `next.config.ts`, `eslint.config.mjs`, `postcss.config.mjs`, `tsconfig.json`.
- Build artifacts: `.next/` (ignored). Path alias: `@/*` maps to repo root.

## Build, Test, and Development Commands
- `npm run dev`: Start local dev server at `http://localhost:3000` with HMR.
- `npm run build`: Production build (`.next/`).
- `npm run start`: Start the production server (after `build`).
- `npm run lint`: Run ESLint using Next.js core‑web‑vitals rules.

Examples:
- Local: `npm run dev`
- Prod preview: `npm run build && npm run start`

## Coding Style & Naming Conventions
- Language: TypeScript (strict). JSX via React 19.
- Formatting/Lint: Use ESLint; auto‑fix with `npx eslint . --fix`.
- Indentation: 2 spaces; keep lines concise and self‑documenting.
- File naming: Next.js routes must be lowercase (`page.tsx`, `layout.tsx`). Components/utilities: `PascalCase.tsx` for components, `kebab-case.ts` for utilities.
- Imports: Prefer `@/path/to/module` alias. Avoid default exports except where Next.js requires them (pages/layouts).
- Styling: Tailwind CSS v4 via `@tailwindcss/postcss`. Keep class lists readable and consistent.

## Testing Guidelines
- No test framework is configured yet. If adding tests, prefer Vitest + React Testing Library.
- Location: colocate tests next to source as `*.test.tsx|ts`.
- Coverage: Aim for ≥80% statements/branches on new/changed code.
- CI‑safe commands (after adding tests): `vitest run --coverage`.

## Commit & Pull Request Guidelines
- Commits: Use Conventional Commits (e.g., `feat:`, `fix:`, `chore:`). Scope optional (e.g., `feat(app): add hero section`).
- PRs: Provide a clear description, link related issues, include screenshots for UI changes, and list test steps.
- Quality gates: Ensure `npm run lint` passes and app builds (`npm run build`).

## Security & Configuration Tips
- Do not commit secrets. Use environment variables (`.env.local` for dev, not committed).
- Node: Use active LTS (Node 20+) compatible with Next.js 16.
- Avoid importing from `.next/` or generated `types/*` directly (except type references); treat generated files as read‑only.
