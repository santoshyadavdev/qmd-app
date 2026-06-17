# Bug Hunt Lab — Design Spec
**Date:** 2026-06-17  
**Project:** qmd-app  
**Status:** Approved

---

## Overview

Add a new **Bug Hunt Lab** page to qmd-app as a dedicated sidebar destination at `/bug-hunt`. The page is a self-contained learning game for developers: players triage generic frontend and backend bug scenarios by matching each bug to the most appropriate fix.

The first version is fully local to the Angular app. It uses a typed in-app scenario catalog instead of backend APIs or persistence. Both **Practice** and **Timed** modes use the same triage board layout so the experience stays familiar while the feedback and scoring rules change by mode.

---

## Goals

- Teach bug-fix patterns through repeated classification and feedback
- Fit naturally into the existing qmd-app sidebar + page routing structure
- Keep the feature local, typed, and easy to extend with more scenarios
- Support keyboard-first play in addition to pointer drag-and-drop
- Provide clear feedback in Practice mode and run summary feedback in Timed mode

## Non-Goals

- No backend storage, leaderboard, sync, or user progress history in v1
- No scenario authoring UI in v1
- No adaptive difficulty system in v1
- No separate page layouts per mode; both modes share one board

---

## Page Structure

Add a new sidebar entry labeled **Bug Hunt Lab** and a lazy-loaded route at `/bug-hunt`.

The page uses one shared shell with these regions:

1. **Header** — title, mode toggle, score, streak, and timer/status summary
2. **Bug queue** — ordered list of remaining bug scenarios
3. **Fix pool** — available fix cards for the active scenario, including distractors
4. **Drop / result zone** — the target area where the player matches a fix to the current bug
5. **Explanation panel** — immediate explanation in Practice mode, end-of-run summary in Timed mode

Only one scenario is active at a time. The queue previews what remains, while the board and result area focus attention on the current match.

---

## User Experience

### Practice Mode

- No round timer
- The player works through the catalog one scenario at a time
- After each match, the UI immediately shows whether the choice was correct
- The explanation panel shows the correct reasoning, category, and bug-fix takeaway before the player advances
- Advancing to the next scenario is an explicit player action so feedback is not skipped accidentally
- Mistakes are tracked for learning feedback, but the main emphasis is explanation over speed

### Timed Mode

- Uses the same board and interaction model as Practice mode
- Starts a fixed-length **90-second** round when the player begins play
- Correct answers increase score and streak
- Incorrect answers break the current streak and increment mistake tracking
- The round advances automatically after each submission instead of waiting on explanation review
- If the current timed deck is exhausted before the timer ends, the store reshuffles the validated scenario catalog and continues play
- When time expires, the board locks and the explanation panel changes to an end-of-run summary
- The summary shows total score, best streak during the run, and the most-missed bug categories

---

## Scenario Catalog

The first release uses a local typed catalog checked into the app source.

For each active scenario, the visible fix pool is the `correctFix` plus that scenario's `distractorFixes`, shuffled for display.

Each scenario entry defines:

- `id`
- `title`
- `bugPattern`
- `category`
- `difficulty`
- `prompt`
- `correctFix`
- `distractorFixes`
- `explanation`

Recommended enums for the initial catalog:

- **Category:** `frontend`, `backend`, `data`, `testing`, `performance`, `accessibility`
- **Difficulty:** `intro`, `intermediate`, `advanced`

Catalog content is intentionally generic rather than qmd-app-specific. Scenarios should teach transferable debugging and fix-selection patterns such as stale UI state, missing null handling, incorrect async sequencing, unsafe query assumptions, flaky tests, inaccessible controls, or inefficient rendering.

If the catalog is empty or any scenario is malformed after validation, the page shows a clear empty state instead of a broken board. The empty state explains that Bug Hunt Lab has no playable scenarios available and disables gameplay controls for the session.

---

## Architecture

Follow the existing qmd-app Angular pattern of a standalone lazy-loaded page component with small focused child components and signal-based local state.

### Proposed units

#### `BugHuntComponent` (page shell)
- Owns the page layout and route-level provider setup
- Renders the title, mode toggle, board regions, and empty-state shell
- Connects presentational components to the game store

#### `BugHuntStore` (local signal-driven service)
- Route-scoped injectable service provided by the page component
- Owns the scenario deck, current scenario index, selected mode, active selection state, score, streak, best streak, remaining time, mistakes, and explanation state
- Exposes computed state for the active bug, available fixes, queue progress, game status, summary data, and empty-state detection
- Contains the pure game rules for submitting matches, advancing rounds, starting timed play, and resetting the session

#### `BugHuntHeaderComponent`
- Displays mode toggle, score, streak, timer, and run status
- Starts or resets a run through store actions

#### `BugQueueComponent`
- Shows remaining scenarios and highlights the active one
- Provides accessible context such as current position in the deck

#### `FixPoolComponent`
- Renders the candidate fix cards for the active scenario
- Supports pointer drag initiation and keyboard selection

#### `MatchZoneComponent`
- Accepts the selected or dragged fix for the current scenario
- Announces correctness feedback and triggers submission

#### `ExplanationPanelComponent`
- In Practice mode, shows per-scenario explanation after each submission
- In Timed mode, stays minimal during play and switches to the final run summary after time expires

### Data ownership

All gameplay state stays local to the Bug Hunt Lab feature. No other qmd-app page depends on or updates this state. The catalog is a static input; the store derives the active board state from that input and the current mode.

---

## Game Rules and State

### Core state

The store should own, at minimum:

- validated scenario deck
- current mode
- active scenario index
- currently selected fix card for keyboard play
- currently dragged fix identifier for pointer play
- score
- current streak
- best streak
- remaining time for Timed mode
- total mistakes
- per-category mistake counts
- latest result for Practice mode feedback
- timed summary state

### Matching flow

1. Load and validate the local scenario catalog
2. Build the playable deck and initial fix options for the first scenario
3. Let the player select a fix through keyboard or pointer interaction
4. Submit the selected fix into the match zone
5. Score the result and record mistake/category data
6. Show explanation immediately in Practice mode or continue straight to the next scenario in Timed mode
7. In Practice mode, wait for explicit player advance; in Timed mode, continue automatically
8. Advance until the Practice deck ends or the timed round expires

### Scoring rules

- **Correct match:** add score, increment streak
- **Incorrect match:** do not award points, reset current streak to zero, increment total mistakes, increment the missed category count
- **Practice completion:** continue until the deck is exhausted
- **Timed completion:** stop interaction when the timer reaches zero, preserve final score and best streak, and show most-missed categories in descending order; if the player had no misses, show an explicit "No missed categories this run" message instead

The exact point values can remain simple in v1: one point per correct match is sufficient unless implementation reveals a compelling reason to weight by difficulty.

---

## Accessibility and Interaction Model

Bug Hunt Lab must work without requiring pointer drag-and-drop.

### Keyboard-first interaction

- The fix pool is fully reachable by keyboard
- A player can focus a fix card, mark it as selected, then move focus to the match zone and submit it
- The active selection is visually obvious and announced with appropriate ARIA state
- The match zone exposes a clear action label so keyboard users understand how to complete a match
- Mode changes, result feedback, timer expiry, and summary transitions are surfaced to assistive technology

### Pointer interaction

- Pointer users can drag a fix card to the match zone
- Drag state is visually distinct without relying on color alone
- Pointer interaction is additive, not the only path

### Feedback and empty states

- Practice feedback uses an `aria-live` strategy so correctness and explanations are announced after submission
- Timed mode announces when the round begins and when time expires
- Empty or invalid catalog states use plain language, explain why the board is unavailable, and keep controls disabled rather than hidden unpredictably

The feature should meet the same AXE and WCAG AA expectations as the rest of the app, with clear focus order, visible focus styling, and non-color-only correctness signals.

---

## Error Handling

- **Empty catalog:** show the Bug Hunt Lab empty state with a short explanation and no playable board
- **Malformed scenario entry:** treat the catalog as invalid, show the same empty state, and avoid partial gameplay from a broken dataset
- **Timer end during interaction:** finalize the timed round once, ignore further submissions, and show the summary state
- **Mode switch mid-run:** reset board state for the newly selected mode so score, streak, explanations, and timer data cannot leak across modes

Because v1 is fully local, failure handling is limited to invalid local data and interaction edge cases rather than network conditions.

---

## Testing

Planned coverage for the first implementation:

- route render for `/bug-hunt`
- sidebar navigation entry render
- mode switch resets state appropriately
- correct answer updates score and streak
- incorrect answer resets streak and records mistakes
- timer countdown and timed-round completion behavior
- Practice explanation visibility after each submission
- Timed summary content including most-missed categories
- keyboard-only matching flow from fix selection to submission
- empty or malformed catalog empty-state rendering

Tests should focus on game rules, accessibility-critical interaction paths, and mode-specific rendering differences rather than cosmetic styling details.

---

## File Shape

The implementation should fit the existing Angular structure with a lazy-loaded page and focused feature components. A likely file shape is:

```text
src/app/pages/bug-hunt/bug-hunt.component.ts
src/app/components/bug-hunt-header/bug-hunt-header.component.ts
src/app/components/bug-queue/bug-queue.component.ts
src/app/components/fix-pool/fix-pool.component.ts
src/app/components/match-zone/match-zone.component.ts
src/app/components/explanation-panel/explanation-panel.component.ts
src/app/features/bug-hunt/bug-hunt.store.ts
src/app/features/bug-hunt/bug-hunt-scenarios.ts
src/app/features/bug-hunt/bug-hunt.types.ts
```

This shape is descriptive rather than mandatory, but the implementation should preserve the same separation of concerns: route shell, local game store, static scenario catalog, and small presentational units.

---

## Out of Scope

- Persisting scores or progress between sessions
- Remote scenario loading
- User-authored scenarios
- Difficulty-based scoring multipliers
- Multiplayer or competitive ranking
- Animation-heavy drag systems that make keyboard use secondary
