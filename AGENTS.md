# Repository Guidelines

## Project Structure & Module Organization
This repository is an Electron + Vue 3 desktop client.
- `src/`: application code.
- `src/components/`: reusable UI components (for example `ImageViewer.vue`).
- `src/views/`: route-level pages (for example `HomeView.vue`, `DateListView.vue`).
- `src/store/` and `src/store/modules/`: Vuex state and module logic.
- `src/router/`: route configuration.
- `src/services/`: API client and adapter layer.
- `src/config/api.json`: backend base URL configuration.
- `electron/`: Electron main/preload processes.
- `public/`: static assets copied at build time.
- `dist/`: build output; treat as generated artifacts.
- Tests live under `src/components/__tests__/*.spec.js`.

## Build, Test, and Development Commands
- `npm install`: install dependencies.
- `npm run electron:serve`: run the desktop app in local development mode.
- `npm run serve`: run Vue dev server only (useful for UI iteration).
- `npm run test`: run Vitest unit tests in `jsdom`.
- `npm run build`: build web assets.
- `npm run electron:build`: package desktop binaries with `electron-builder`.

Before local verification, ensure the backend service is reachable (default `http://localhost:8080`).

## Coding Style & Naming Conventions
- Use Vue 3 SFCs and existing Vuex patterns.
- Follow existing import alias usage: `@/` for paths under `src`.
- Prefer 2-space indentation and keep formatting consistent with the file you modify.
- Component files use PascalCase (`ScenePreview.vue`); view files use `*View.vue`; store module files use lower camel case (`detectJobs.js`).
- Keep comments focused on non-obvious logic; avoid redundant comments.

## Testing Guidelines
- Frameworks: `vitest` + `@vue/test-utils` with `jsdom`.
- Test files must be named `*.spec.js` and placed in `src/components/__tests__/`.
- Add or update tests for component behavior, computed state, and Vuex interactions when changing UI logic.
- Run `npm run test` before opening a PR.

## Commit & Pull Request Guidelines
- Follow Conventional Commit style seen in history, e.g. `feat(views): ...`, `fix(store): ...`, `docs: ...`, `test: ...`, `chore: ...`.
- Keep each commit focused on one logical change.
- PRs should include:
  - concise summary and affected paths,
  - linked issue/task ID,
  - test evidence (command run and result),
  - screenshots/GIFs for UI changes.
