# RabbitHole App Split Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Split Bug Hunt Lab out of `qmd-app` into a second Angular application named `rabbit-hole` inside the same workspace.

**Architecture:** Keep the existing repository and Angular workspace, but add a second SSR-enabled Angular app under `projects/rabbit-hole/`. Move all Bug Hunt feature code into RabbitHole, remove the Bug Hunt route and navigation entry from `qmd-app`, and expose explicit per-app build, test, and serve commands.

**Tech Stack:** Angular 22, Angular SSR, TypeScript 6, Vitest via `@angular/build:unit-test`, Express server entrypoints

---

## File Structure Map

### Workspace configuration

- Modify: `angular.json` — add the `rabbit-hole` application and its `build`, `serve`, and `test` targets.
- Modify: `tsconfig.json` — include the generated `projects/rabbit-hole/tsconfig.app.json` and `projects/rabbit-hole/tsconfig.spec.json` references if Angular CLI does not add them automatically.
- Modify: `package.json` — keep the current `qmd-app` defaults, and add explicit `rabbit-hole` build/test/serve scripts.

### RabbitHole application shell

- Create: `projects/rabbit-hole/src/main.ts`
- Create: `projects/rabbit-hole/src/main.server.ts`
- Create: `projects/rabbit-hole/src/server.ts`
- Create: `projects/rabbit-hole/src/app/app.ts`
- Create: `projects/rabbit-hole/src/app/app.html`
- Create: `projects/rabbit-hole/src/app/app.css`
- Create: `projects/rabbit-hole/src/app/app.config.ts`
- Create: `projects/rabbit-hole/src/app/app.config.server.ts`
- Create: `projects/rabbit-hole/src/app/app.routes.ts`
- Create: `projects/rabbit-hole/src/app/app.routes.server.ts`
- Create: `projects/rabbit-hole/src/app/app.spec.ts`
- Create: `projects/rabbit-hole/src/app/app.routes.spec.ts`
- Create: `projects/rabbit-hole/tsconfig.app.json`
- Create: `projects/rabbit-hole/tsconfig.spec.json`

### RabbitHole Bug Hunt feature

- Create: `projects/rabbit-hole/src/app/pages/bug-hunt/bug-hunt.component.ts`
- Create: `projects/rabbit-hole/src/app/pages/bug-hunt/bug-hunt.component.spec.ts`
- Create: `projects/rabbit-hole/src/app/features/bug-hunt/bug-hunt.store.ts`
- Create: `projects/rabbit-hole/src/app/features/bug-hunt/bug-hunt.store.spec.ts`
- Create: `projects/rabbit-hole/src/app/features/bug-hunt/bug-hunt.types.ts`
- Create: `projects/rabbit-hole/src/app/features/bug-hunt/bug-hunt-scenarios.ts`
- Create: `projects/rabbit-hole/src/app/components/bug-hunt-header/bug-hunt-header.component.ts`
- Create: `projects/rabbit-hole/src/app/components/bug-queue/bug-queue.component.ts`
- Create: `projects/rabbit-hole/src/app/components/explanation-panel/explanation-panel.component.ts`
- Create: `projects/rabbit-hole/src/app/components/fix-pool/fix-pool.component.ts`
- Create: `projects/rabbit-hole/src/app/components/match-zone/match-zone.component.ts`

### qmd-app cleanup

- Modify: `src/app/app.routes.ts`
- Modify: `src/app/app.routes.spec.ts`
- Modify: `src/app/components/sidebar/sidebar.component.ts`
- Delete after move: `src/app/pages/bug-hunt/bug-hunt.component.ts`
- Delete after move: `src/app/pages/bug-hunt/bug-hunt.component.spec.ts`
- Delete after move: `src/app/features/bug-hunt/bug-hunt.store.ts`
- Delete after move: `src/app/features/bug-hunt/bug-hunt.store.spec.ts`
- Delete after move: `src/app/features/bug-hunt/bug-hunt.types.ts`
- Delete after move: `src/app/features/bug-hunt/bug-hunt-scenarios.ts`
- Delete after move: `src/app/components/bug-hunt-header/bug-hunt-header.component.ts`
- Delete after move: `src/app/components/bug-queue/bug-queue.component.ts`
- Delete after move: `src/app/components/explanation-panel/explanation-panel.component.ts`
- Delete after move: `src/app/components/fix-pool/fix-pool.component.ts`
- Delete after move: `src/app/components/match-zone/match-zone.component.ts`

## Task 1: Scaffold the RabbitHole Angular application

**Files:**
- Create: `projects/rabbit-hole/src/main.ts`
- Create: `projects/rabbit-hole/src/main.server.ts`
- Create: `projects/rabbit-hole/src/server.ts`
- Create: `projects/rabbit-hole/src/app/app.ts`
- Create: `projects/rabbit-hole/src/app/app.html`
- Create: `projects/rabbit-hole/src/app/app.css`
- Create: `projects/rabbit-hole/src/app/app.config.ts`
- Create: `projects/rabbit-hole/src/app/app.config.server.ts`
- Create: `projects/rabbit-hole/src/app/app.routes.ts`
- Create: `projects/rabbit-hole/src/app/app.routes.server.ts`
- Create: `projects/rabbit-hole/src/app/app.spec.ts`
- Create: `projects/rabbit-hole/tsconfig.app.json`
- Create: `projects/rabbit-hole/tsconfig.spec.json`
- Modify: `angular.json`
- Modify: `tsconfig.json`
- Test: `npx ng build rabbit-hole`

- [ ] **Step 1: Prove the second app does not exist yet**

Run:

```bash
npx ng build rabbit-hole
```

Expected: FAIL with a message like `Project "rabbit-hole" does not exist.`

- [ ] **Step 2: Generate the second Angular application with SSR enabled**

Run:

```bash
npx ng generate application rabbit-hole --ssr --routing --style css --prefix rabbit-hole
```

Expected new files under `projects/rabbit-hole/` including:

```text
projects/rabbit-hole/src/main.ts
projects/rabbit-hole/src/main.server.ts
projects/rabbit-hole/src/server.ts
projects/rabbit-hole/src/app/app.ts
projects/rabbit-hole/src/app/app.html
projects/rabbit-hole/src/app/app.css
projects/rabbit-hole/src/app/app.config.ts
projects/rabbit-hole/src/app/app.config.server.ts
projects/rabbit-hole/src/app/app.routes.ts
projects/rabbit-hole/src/app/app.routes.server.ts
projects/rabbit-hole/src/app/app.spec.ts
projects/rabbit-hole/tsconfig.app.json
projects/rabbit-hole/tsconfig.spec.json
```

- [ ] **Step 3: Confirm the workspace now declares RabbitHole**

Check:

```json
{
  "projects": {
    "qmd-app": { "...": "existing config" },
    "rabbit-hole": {
      "projectType": "application",
      "root": "projects/rabbit-hole",
      "sourceRoot": "projects/rabbit-hole/src"
    }
  }
}
```

Also confirm `tsconfig.json` references include:

```json
{
  "references": [
    { "path": "./tsconfig.app.json" },
    { "path": "./tsconfig.spec.json" },
    { "path": "./projects/rabbit-hole/tsconfig.app.json" },
    { "path": "./projects/rabbit-hole/tsconfig.spec.json" }
  ]
}
```

If Angular CLI omitted the two RabbitHole references, add them manually.

- [ ] **Step 4: Verify the generated app builds before feature work**

Run:

```bash
npx ng build rabbit-hole
```

Expected: PASS and emit `dist/rabbit-hole`.

- [ ] **Step 5: Commit the scaffold**

```bash
git add angular.json tsconfig.json projects/rabbit-hole
git commit -m "feat: scaffold rabbit-hole app"
```

## Task 2: Move Bug Hunt Lab into RabbitHole and make it the app’s main route

**Files:**
- Modify: `projects/rabbit-hole/src/app/app.ts`
- Modify: `projects/rabbit-hole/src/app/app.html`
- Modify: `projects/rabbit-hole/src/app/app.css`
- Modify: `projects/rabbit-hole/src/app/app.routes.ts`
- Create: `projects/rabbit-hole/src/app/app.routes.spec.ts`
- Modify: `projects/rabbit-hole/src/app/app.spec.ts`
- Create via move: `projects/rabbit-hole/src/app/pages/bug-hunt/bug-hunt.component.ts`
- Create via move: `projects/rabbit-hole/src/app/pages/bug-hunt/bug-hunt.component.spec.ts`
- Create via move: `projects/rabbit-hole/src/app/features/bug-hunt/bug-hunt.store.ts`
- Create via move: `projects/rabbit-hole/src/app/features/bug-hunt/bug-hunt.store.spec.ts`
- Create via move: `projects/rabbit-hole/src/app/features/bug-hunt/bug-hunt.types.ts`
- Create via move: `projects/rabbit-hole/src/app/features/bug-hunt/bug-hunt-scenarios.ts`
- Create via move: `projects/rabbit-hole/src/app/components/bug-hunt-header/bug-hunt-header.component.ts`
- Create via move: `projects/rabbit-hole/src/app/components/bug-queue/bug-queue.component.ts`
- Create via move: `projects/rabbit-hole/src/app/components/explanation-panel/explanation-panel.component.ts`
- Create via move: `projects/rabbit-hole/src/app/components/fix-pool/fix-pool.component.ts`
- Create via move: `projects/rabbit-hole/src/app/components/match-zone/match-zone.component.ts`
- Test: `projects/rabbit-hole/src/app/app.spec.ts`
- Test: `projects/rabbit-hole/src/app/app.routes.spec.ts`
- Test: `projects/rabbit-hole/src/app/pages/bug-hunt/bug-hunt.component.spec.ts`
- Test: `projects/rabbit-hole/src/app/features/bug-hunt/bug-hunt.store.spec.ts`

- [ ] **Step 1: Write failing RabbitHole shell and route specs**

Create `projects/rabbit-hole/src/app/app.routes.spec.ts`:

```ts
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { routes } from './app.routes';

describe('RabbitHole route integration', () => {
  it('renders Bug Hunt Lab at /', async () => {
    TestBed.configureTestingModule({
      providers: [provideRouter(routes)],
    });

    const harness = await RouterTestingHarness.create();
    await harness.navigateByUrl('/');

    expect(
      harness.routeNativeElement?.querySelector('h1')?.textContent,
    ).toContain('Bug Hunt Lab');
  });
});
```

Update `projects/rabbit-hole/src/app/app.spec.ts`:

```ts
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { App } from './app';
import { routes } from './app.routes';

describe('RabbitHole App', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [App],
      providers: [provideRouter(routes)],
    }).compileComponents();
  });

  it('renders the RabbitHole shell', async () => {
    const fixture = TestBed.createComponent(App);
    fixture.detectChanges();
    await fixture.whenStable();

    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.querySelector('.rabbit-hole-shell')).not.toBeNull();
    expect(compiled.textContent).toContain('RabbitHole');
  });
});
```

- [ ] **Step 2: Run the new RabbitHole specs and confirm they fail**

Run:

```bash
npx ng test rabbit-hole --watch=false --include projects/rabbit-hole/src/app/app.spec.ts --include projects/rabbit-hole/src/app/app.routes.spec.ts
```

Expected: FAIL because the generated app still renders the default Angular welcome shell and does not route to Bug Hunt Lab.

- [ ] **Step 3: Move the Bug Hunt feature files into RabbitHole**

Run:

```bash
mkdir -p projects/rabbit-hole/src/app/pages
mkdir -p projects/rabbit-hole/src/app/features
mkdir -p projects/rabbit-hole/src/app/components
git mv src/app/pages/bug-hunt projects/rabbit-hole/src/app/pages/
git mv src/app/features/bug-hunt projects/rabbit-hole/src/app/features/
git mv src/app/components/bug-hunt-header projects/rabbit-hole/src/app/components/
git mv src/app/components/bug-queue projects/rabbit-hole/src/app/components/
git mv src/app/components/explanation-panel projects/rabbit-hole/src/app/components/
git mv src/app/components/fix-pool projects/rabbit-hole/src/app/components/
git mv src/app/components/match-zone projects/rabbit-hole/src/app/components/
```

Then update `projects/rabbit-hole/src/app/app.routes.ts` to make Bug Hunt the landing route:

```ts
import { Routes } from '@angular/router';

export const routes: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./pages/bug-hunt/bug-hunt.component').then(
        (m) => m.BugHuntComponent,
      ),
  },
];
```

- [ ] **Step 4: Replace the generated shell with RabbitHole branding**

Update `projects/rabbit-hole/src/app/app.ts`:

```ts
import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';

@Component({
  selector: 'rabbit-hole-root',
  imports: [RouterOutlet],
  templateUrl: './app.html',
  styleUrl: './app.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class App {}
```

Update `projects/rabbit-hole/src/app/app.html`:

```html
<section class="rabbit-hole-shell">
  <header class="rabbit-hole-header">
    <div>
      <p class="eyebrow">RabbitHole</p>
      <h1>Bug Hunt Lab</h1>
      <p>Match each bug to the safest fix.</p>
    </div>
  </header>

  <main class="rabbit-hole-main">
    <router-outlet />
  </main>
</section>
```

Update `projects/rabbit-hole/src/app/app.css`:

```css
:host {
  display: block;
  min-height: 100vh;
  background: var(--qmd-bg);
  color: var(--qmd-text-primary);
}

.rabbit-hole-shell {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
}

.rabbit-hole-header {
  padding: 24px;
  border-bottom: 1px solid var(--qmd-border);
}

.eyebrow {
  margin: 0 0 8px;
  color: var(--qmd-purple);
  font-size: 12px;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}

.rabbit-hole-header h1 {
  margin: 0;
  color: var(--qmd-text-primary);
}

.rabbit-hole-header p:last-child {
  margin: 8px 0 0;
  color: var(--qmd-text-secondary);
}

.rabbit-hole-main {
  flex: 1;
  padding: 24px;
}
```

- [ ] **Step 5: Run RabbitHole tests until the migrated feature passes**

Run:

```bash
npx ng test rabbit-hole --watch=false
```

Expected: PASS for:

```text
projects/rabbit-hole/src/app/app.spec.ts
projects/rabbit-hole/src/app/app.routes.spec.ts
projects/rabbit-hole/src/app/pages/bug-hunt/bug-hunt.component.spec.ts
projects/rabbit-hole/src/app/features/bug-hunt/bug-hunt.store.spec.ts
```

- [ ] **Step 6: Commit the moved feature**

```bash
git add projects/rabbit-hole/src/app
git commit -m "feat: move bug hunt into rabbit-hole"
```

## Task 3: Remove Bug Hunt from qmd-app routes and navigation

**Files:**
- Modify: `src/app/app.routes.ts`
- Modify: `src/app/app.routes.spec.ts`
- Modify: `src/app/components/sidebar/sidebar.component.ts`
- Test: `src/app/app.routes.spec.ts`

- [ ] **Step 1: Rewrite qmd-app route tests to express the new boundary**

Update `src/app/app.routes.spec.ts`:

```ts
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { routes } from './app.routes';
import { SidebarComponent } from './components/sidebar/sidebar.component';

describe('QMD navigation boundaries', () => {
  it('does not register the bug hunt route', () => {
    expect(routes.some((route) => route.path === 'bug-hunt')).toBe(false);
  });

  it('does not show a Bug Hunt Lab sidebar entry', async () => {
    await TestBed.configureTestingModule({
      imports: [SidebarComponent],
      providers: [provideRouter([])],
    }).compileComponents();

    const fixture = TestBed.createComponent(SidebarComponent);
    fixture.detectChanges();

    const links = Array.from<HTMLAnchorElement>(
      fixture.nativeElement.querySelectorAll('a'),
    ).map((link) => link.textContent?.replace(/\s+/g, ' ').trim());

    expect(links).not.toContain('🐞 Bug Hunt Lab');
  });
});
```

- [ ] **Step 2: Run the qmd route spec and confirm it fails before cleanup**

Run:

```bash
npx ng test qmd-app --watch=false --include src/app/app.routes.spec.ts
```

Expected: FAIL because `src/app/app.routes.ts` still contains the `bug-hunt` route and `src/app/components/sidebar/sidebar.component.ts` still includes the Bug Hunt navigation item.

- [ ] **Step 3: Remove the route and sidebar item from qmd-app**

Update `src/app/app.routes.ts` to remove:

```ts
{
  path: 'bug-hunt',
  loadComponent: () =>
    import('./pages/bug-hunt/bug-hunt.component').then(
      (m) => m.BugHuntComponent,
    ),
},
```

Update `src/app/components/sidebar/sidebar.component.ts` so `navItems` becomes:

```ts
readonly navItems: NavItem[] = [
  { path: '/search', label: 'Search', icon: '🔍', ariaLabel: 'Go to search' },
  { path: '/collections', label: 'Collections', icon: '📁', ariaLabel: 'Manage collections' },
  { path: '/index', label: 'Index & Embed', icon: '⚡', ariaLabel: 'Index and embed documents' },
  { path: '/documents', label: 'Documents', icon: '📄', ariaLabel: 'Browse documents' },
  { path: '/context', label: 'Context', icon: '🏷️', ariaLabel: 'Manage context' },
];
```

- [ ] **Step 4: Run the qmd-app suite and verify the cleanup passes**

Run:

```bash
npx ng test qmd-app --watch=false
```

Expected: PASS with no remaining `bug-hunt` references in qmd-app route tests.

- [ ] **Step 5: Commit the qmd-app cleanup**

```bash
git add src/app/app.routes.ts src/app/app.routes.spec.ts src/app/components/sidebar/sidebar.component.ts
git commit -m "refactor: remove bug hunt from qmd-app"
```

## Task 4: Add explicit per-app scripts and verify the multi-app workspace

**Files:**
- Modify: `package.json`
- Test: `npm run build`
- Test: `npm run build:rabbit-hole`
- Test: `npm test -- --watch=false`
- Test: `npm run test:rabbit-hole -- --watch=false`

- [ ] **Step 1: Prove the RabbitHole convenience scripts do not exist yet**

Run:

```bash
npm run start:rabbit-hole
```

Expected: FAIL with `Missing script: "start:rabbit-hole"`.

- [ ] **Step 2: Add explicit multi-app scripts to `package.json`**

Update the `scripts` block to:

```json
{
  "scripts": {
    "ng": "ng",
    "start": "ng serve qmd-app",
    "start:rabbit-hole": "ng serve rabbit-hole --port 4300",
    "build": "ng build qmd-app",
    "build:rabbit-hole": "ng build rabbit-hole",
    "watch": "ng build qmd-app --watch --configuration development",
    "test": "ng test qmd-app",
    "test:rabbit-hole": "ng test rabbit-hole",
    "serve:ssr:qmd-app": "node dist/qmd-app/server/server.mjs",
    "serve:ssr:rabbit-hole": "node dist/rabbit-hole/server/server.mjs"
  }
}
```

- [ ] **Step 3: Verify both applications build and test independently**

Run:

```bash
npm test -- --watch=false
npm run test:rabbit-hole -- --watch=false
npm run build
npm run build:rabbit-hole
```

Expected:

```text
All qmd-app tests pass
All rabbit-hole tests pass
dist/qmd-app is emitted
dist/rabbit-hole is emitted
```

- [ ] **Step 4: Smoke-test the RabbitHole dev server**

Run:

```bash
npm run start:rabbit-hole
```

Expected: the dev server starts on `http://localhost:4300` and renders RabbitHole with Bug Hunt Lab as the landing page.

- [ ] **Step 5: Commit the script and verification updates**

```bash
git add package.json
git commit -m "chore: add multi-app workspace scripts"
```

## Self-Review Checklist

### Spec coverage

- Add second Angular app in same workspace — covered by Task 1.
- Give RabbitHole its own shell, routes, and SSR entrypoints — covered by Tasks 1 and 2.
- Move Bug Hunt ownership completely into RabbitHole — covered by Task 2.
- Remove Bug Hunt from qmd-app — covered by Task 3.
- Keep both apps buildable/testable and expose clear commands — covered by Task 4.

### Placeholder scan

- No `TODO`, `TBD`, or “similar to Task N” placeholders remain.
- All commands, file paths, and code snippets are concrete.

### Type consistency

- RabbitHole root app continues using Angular standalone `App`.
- Bug Hunt file names stay unchanged during the move, only their paths change.
- qmd-app route cleanup references the exact current `routes` array and `SidebarComponent.navItems` names.
