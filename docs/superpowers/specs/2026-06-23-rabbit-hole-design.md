# RabbitHole Multi-App Workspace Design

## Goal

Move Bug Hunt Lab out of `qmd-app` and into a separate Angular application named `rabbit-hole` within the same workspace, while keeping both apps in the same repository and preserving the existing SSR/server pattern.

## Current Context

The workspace currently contains a single Angular application, `qmd-app`, rooted at `src/`. Bug Hunt Lab is implemented as one lazy route inside that app and depends on app-local routes, components, feature state, and tests. The repo already uses Angular SSR-style application builds and server entries, so the second app should follow the same operational model instead of introducing a different deployment pattern.

## Desired Outcome

After the change:

- `qmd-app` continues to own the existing QMD product areas such as search, collections, index, documents, context, and settings.
- `rabbit-hole` becomes a separate Angular application in the same workspace and becomes the sole home for Bug Hunt Lab.
- Bug Hunt Lab no longer appears as a route inside `qmd-app`.
- Each app has its own routes, app config, entrypoints, SSR/server files, and Angular CLI targets.
- Shared package dependencies and repo-level configuration remain centralized unless a real need for stronger code sharing emerges later.

## Recommended Architecture

The workspace should use Angular’s multi-application support in `angular.json` with two sibling applications:

1. `qmd-app` remains rooted in the current `src/` tree.
2. `rabbit-hole` is added under `projects/rabbit-hole/`.

`rabbit-hole` should be created as a full application, not a library or route alias. It should have its own:

- browser entrypoint
- server entrypoint
- application config
- route config
- app shell
- build target
- serve target
- test target

This keeps application ownership clear and avoids half-splitting the feature across two products.

## File and Ownership Model

The Bug Hunt feature should move entirely into the new app’s source tree. That includes:

- the Bug Hunt page component
- the feature store
- the scenario catalog
- the Bug Hunt UI subcomponents
- the related route and component tests

`qmd-app` should remove the `/bug-hunt` route and any direct imports that exist only for that feature.

Repo-level configuration should stay shared where it already is:

- `package.json`
- `package-lock.json`
- root TypeScript configuration
- Tailwind/CSS tooling
- top-level Angular workspace configuration

No shared Angular library should be introduced as part of this move unless a concrete duplication problem appears during migration. The initial split should prefer simplicity over premature abstraction.

## Routing and UX Boundaries

`qmd-app` should no longer expose Bug Hunt Lab. Its route table remains focused on the QMD experience.

`rabbit-hole` should start with Bug Hunt Lab as its initial feature and may use either:

- a default route that renders Bug Hunt Lab directly, or
- a small app shell route structure with Bug Hunt Lab as the primary landing page

The second option is preferable if RabbitHole is expected to grow into a broader product, because it leaves room for future features without restructuring the app shell later.

RabbitHole should have distinct branding in its app shell so it is clearly a separate application rather than a hidden subsection of `qmd-app`.

## SSR and Server Strategy

RabbitHole should mirror the workspace’s current SSR/server pattern rather than introducing a frontend-only build. That means:

- its own `main.ts`
- its own `main.server.ts`
- its own `server.ts`
- its own build/serve configuration in `angular.json`

This keeps deployment and local development patterns consistent across both apps and avoids special-case tooling for one application.

## Migration Flow

The migration should happen in this order:

1. Add the new `rabbit-hole` application to the Angular workspace.
2. Create RabbitHole’s app shell, config, routes, and SSR/server entry files.
3. Move Bug Hunt Lab feature files from `qmd-app` into RabbitHole.
4. Repoint RabbitHole routes so Bug Hunt becomes its primary feature.
5. Remove the Bug Hunt route and dead imports from `qmd-app`.
6. Update tests to validate both apps in their new locations.
7. Verify each app can build independently and that the relevant test suites pass.

This sequence minimizes broken intermediate states and makes ownership changes explicit.

## Testing Strategy

Testing should verify both product boundaries and migration correctness:

- `qmd-app` tests should continue passing after Bug Hunt is removed.
- RabbitHole should have passing component and route tests for the migrated Bug Hunt feature.
- Each app should build successfully through its own Angular target.
- Local serve flows should work independently for each application.

The migration is only complete when both apps are valid Angular applications in the same workspace and the Bug Hunt feature is no longer coupled to `qmd-app`.

## Non-Goals

This design does not include:

- splitting the repository
- introducing a shared Angular library by default
- redesigning Bug Hunt gameplay
- rewriting Bug Hunt into a backend-driven feature
- merging the two apps behind runtime feature flags

## Risks and Constraints

- The workspace currently assumes a single app rooted at `src/`, so `angular.json`, server entry wiring, and test targets must be updated carefully.
- Moving files without a clear ownership boundary can leave broken imports in either app if the migration is partial.
- Shared styling tokens may need light cleanup if any Bug Hunt visuals currently rely on `qmd-app`-specific context.
- Future workspace commands should make it obvious which app is being served, built, or tested.

## Decision Summary

The chosen design is to keep one repository and one Angular workspace, but split the product into two full Angular applications. `qmd-app` stays focused on the existing QMD experience, while `rabbit-hole` becomes a separate SSR-enabled Angular app that owns Bug Hunt Lab outright.
