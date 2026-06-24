# CodeRabbit CLI Review Integration — Design Spec

**Date:** 2026-06-24  
**Project:** rabbit-hole (Bug Hunt Lab)  
**Status:** Approved

---

## Overview

Integrate CodeRabbit CLI into Bug Hunt Lab so players can request a live AI-powered code review of the current bug scenario. Instead of static explanations, the app runs CodeRabbit CLI on the server against the scenario's buggy code and displays structured review findings in the UI.

The review is on-demand — a "Get CodeRabbit Review" button lets the player trigger it at any time during gameplay. Game rules, scoring, and modes remain unchanged.

---

## Goals

- Replace static explanations with live CodeRabbit CLI analysis for richer learning feedback
- Keep the review on-demand so it doesn't slow down gameplay
- Run CodeRabbit server-side with a shared API key so players need no account
- Fit naturally into the existing rabbit-hole Express SSR server

## Non-Goals

- No client-side CLI execution
- No user-managed CodeRabbit accounts or API keys
- No changes to game rules, scoring, or mode behavior
- No pre-computed/cached reviews in v1
- No CodeRabbit HTTP API integration (CLI only)

---

## Architecture

### Server-Side

The existing Express SSR server (rabbit-hole's `server.ts`) gains a new API route:

```
POST /api/coderabbit-review
Content-Type: application/json

Request:  { scenarioId: string, code: string, filename: string }
Response: { comments: Comment[], summary: string }

Comment:  { line: number, message: string, severity: string }
```

#### Server Flow

1. Receive request with the scenario's buggy code and a filename (e.g., `component.ts`)
2. Create a temporary directory via `fs.mkdtemp`
3. Initialize a git repository in the temp dir (`git init`)
4. Create an initial empty commit to establish a baseline
5. Write the buggy code to the specified filename
6. Stage the file (`git add`)
7. Execute `npx coderabbit review` (or the globally installed `cr` binary) with the CodeRabbit API key from the environment
8. Capture and parse stdout into structured review comments
9. Clean up the temp directory (fire-and-forget on failure)
10. Return the parsed review as JSON

#### Environment Configuration

- `CODERABBIT_API_KEY` — required server environment variable
- CLI binary: either `coderabbit` globally installed or invoked via `npx @coderabbit/cli`

#### Rate Limiting

In-memory rate limiter on the endpoint: 10 requests per minute per client IP. Returns 429 if exceeded.

---

### Frontend

#### New Service: `CodeRabbitReviewService`

A root-provided Angular service that handles HTTP communication with the server endpoint.

```typescript
interface CodeRabbitReview {
  comments: { line: number; message: string; severity: string }[];
  summary: string;
}
```

Methods:
- `requestReview(scenarioId: string, code: string, filename: string): Observable<CodeRabbitReview>`

#### Store Changes: `BugHuntStore`

New state:
- `reviewLoading: signal<boolean>` — true while the server is processing
- `reviewResult: signal<CodeRabbitReview | null>` — the latest review response
- `reviewError: signal<string | null>` — error message if the request failed

New action:
- `requestReview(scenarioId: string)` — triggers the HTTP call using the current scenario's code, sets loading state, and updates result or error on completion

The review state resets when the player advances to a new scenario.

#### UI Changes: Explanation Panel

The `ExplanationPanelComponent` gains a new display mode:

1. **Default state:** Shows a "Get CodeRabbit Review" button (no static explanation visible)
2. **Loading state:** Button disabled, skeleton/spinner with "CodeRabbit is reviewing this code..."
3. **Success state:** Renders the review summary and inline comments with line references and severity badges
4. **Error state:** Shows a human-readable error message with a "Retry" button
5. **Fallback:** If the server is unavailable (503), falls back to displaying the static `explanation` field from the scenario catalog

The button is keyboard-accessible with a clear `aria-label`.

---

## Scenario Catalog Change

Each scenario entry gains a new required field:

- `code: string` — the actual buggy source code that CodeRabbit will review

The existing `explanation` field is retained as a fallback when CodeRabbit is unavailable.

The existing `prompt` field continues to describe the bug in natural language for the game UI. The new `code` field contains the literal source code that the CLI reviews.

---

## Error Handling

| Scenario | Server Response | UI Behavior |
|----------|----------------|-------------|
| CodeRabbit CLI not installed | 503 Service Unavailable | "Review unavailable" + fallback to static explanation |
| API key missing or invalid | 401 Unauthorized | "CodeRabbit not configured" message |
| CLI execution timeout (>30s) | 504 Gateway Timeout | "Review timed out, try again" + retry button |
| Malformed CLI output | 500 Internal Server Error | "Review failed" + retry button |
| Rate limit exceeded | 429 Too Many Requests | "Too many requests, please wait" |
| Temp dir cleanup failure | (logged, no user impact) | N/A |
| Network error (frontend) | N/A | Error message + retry button |

---

## Testing

### Server Unit Tests

- Verify temp directory creation and git initialization
- Verify CLI is invoked with correct arguments and environment
- Verify stdout parsing produces structured comments
- Verify temp directory cleanup after success and failure
- Verify error responses for missing CLI, bad key, timeout
- Verify rate limiting rejects excess requests

### Frontend Tests

- Mock HTTP service; verify loading state renders on request
- Verify success state displays comments and summary
- Verify error state displays message and retry button
- Verify review state resets on scenario advance
- Verify button is keyboard-accessible and has correct aria-label
- Verify fallback to static explanation on 503

### Integration Test

- End-to-end flow with a stubbed CLI binary that outputs a known response
- Verify the full chain from button click → server → CLI stub → UI display

---

## File Shape

```text
projects/rabbit-hole/src/app/services/coderabbit-review.service.ts
projects/rabbit-hole/src/server/routes/coderabbit-review.route.ts
projects/rabbit-hole/src/server/utils/temp-git-repo.ts
projects/rabbit-hole/src/server/utils/cli-runner.ts
```

Existing files modified:
- `projects/rabbit-hole/src/server.ts` — register the new route
- Bug Hunt store — add review state and action
- Explanation panel component — add review display modes
- Scenario catalog types — add `code` field

---

## Security Considerations

- The API key is server-side only; never exposed to the client
- Rate limiting prevents abuse of the shared key
- Temp directories use unique random names and are cleaned up promptly
- The endpoint validates `scenarioId` against the known scenario catalog; requests with unknown IDs are rejected with 400 Bad Request
- Arbitrary code execution is scoped to CodeRabbit's own review sandbox

---

## Out of Scope

- Reviewing user-submitted code (only catalog scenarios)
- Persistent review history or caching
- Multiple CodeRabbit configurations per scenario
- CodeRabbit HTTP API (CLI-only in this version)
- Changes to game rules or scoring based on review results
