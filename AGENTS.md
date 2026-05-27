# Repository Guidelines

## Project Structure & Module Organization
This is a pnpm/Turbo monorepo for a 3D virtual tabletop application. App code lives in `apps/*`: `apps/web` is the Next.js frontend and API app, while `apps/server`, `apps/community`, and `apps/notification` contain TypeScript service entrypoints under `src/`. Shared TypeScript utilities, constants, auth helpers, events, and types live in `packages/shared/src`. Web API tests are currently under `apps/web/tests`. Prisma schema and web database config are in `apps/web/prisma`. Static web assets live in `apps/web/public`, and project docs are under `docs/`.

## Build, Test, and Development Commands
Use pnpm from the repository root.

- `pnpm dev`: runs `turbo dev` for workspace development tasks.
- `pnpm build`: runs Turbo builds, including Next.js output in `.next/` where applicable.
- `pnpm lint`: runs workspace lint tasks; currently the web app uses Next.js ESLint config.
- `pnpm typecheck`: runs workspace type-check tasks where package scripts exist.
- `pnpm clean`: clears Turbo-managed build outputs.
- `pnpm --filter @3d-quests/web dev`: starts only the Next.js web app.

Do not rely on root `pnpm test` yet; most packages still contain placeholder test scripts.

## Coding Style & Naming Conventions
Use TypeScript ES modules. Keep strict typing enabled and avoid weakening `strict`, `isolatedModules`, or related compiler settings. Follow existing indentation and formatting conventions in touched files. Use PascalCase for React components and exported types, camelCase for functions and variables, and kebab-case for route or directory names when adding web routes. In `apps/web`, use the `@/*` path alias for imports from `src`.

## Testing Guidelines
Vitest is present in the web app, and existing API test files live in `apps/web/tests/api`. Add tests close to the behavior being changed, using descriptive names such as `campaign.test.ts` or grouped API tests under `tests/api/`. Run targeted tests with the package filter once a test script is added or confirmed.

## Commit & Pull Request Guidelines
Recent commits use short, imperative summaries such as `Added jwt plugin to better-auth`. Keep commit messages concise and focused on one change. Pull requests should include a brief description, testing notes, linked issues when relevant, and screenshots for visible UI changes. Mention schema, auth, or infrastructure changes explicitly.
