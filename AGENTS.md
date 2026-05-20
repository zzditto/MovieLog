# AGENTS.md

## Project

Obsidian plugin for movie/TV watch tracking with TMDB integration. Single-package TypeScript project, not a monorepo.

## Commands

- `npm run dev` — esbuild watch mode for development
- `npm run build` — typecheck (`tsc -noEmit -skipLibCheck`) then esbuild production bundle
- `npm run lint` — ESLint with `eslint-plugin-obsidianmd` + `typescript-eslint`
- `npm run version` — bumps `manifest.json` and `versions.json` from `package.json` version

No test framework is configured. Verification = lint + build.

## Architecture

Entrypoint: `src/main.ts` → bundled to `main.js` via esbuild (`esbuild.config.mjs`).

Source files in `src/`:
- `main.ts` — Plugin class, commands, ribbon icon, event wiring
- `types.ts` — All TypeScript interfaces, enums, default settings
- `settings.ts` — Plugin settings tab UI
- `tmdb-api.ts` — TMDB REST API calls (uses `requestUrl` from Obsidian, not `fetch`)
- `record-generator.ts` — Markdown template generation, year-file append logic
- `card-wall-view.ts` — `ItemView` subclass for poster wall display
- `search-modal.ts` — TMDB search modal UI
- `season-modal.ts` — Season selection modal UI

## Key Conventions

- **`main.js` is generated** — never edit it directly; edit `src/*.ts` and rebuild.
- **`styles.css` is a source file** — not generated, ships as-is with the plugin.
- **`manifest.json` / `versions.json`** — updated by `npm run version` (via `version-bump.mjs`). Don't hand-edit versions.
- **Indentation**: tabs (width 4), per `.editorconfig`.
- **esbuild externals**: `obsidian`, `electron`, all `@codemirror/*`, `@lezer/*`, and Node builtins. These are resolved at runtime by Obsidian.
- **TMDB API**: uses `requestUrl` (Obsidian API), not browser `fetch`. All API calls go through `src/tmdb-api.ts`.
- **UI language**: Chinese (zh-CN) is the default and primary language for all user-facing strings.
- **Record storage**: watch records are stored as Markdown inside year-files (`{folder}/{year}.md`) with YAML frontmatter stats.

## Release

Push a git tag → `.github/workflows/release.yml` builds and creates a GitHub release with `main.js`, `manifest.json`, `styles.css`.
