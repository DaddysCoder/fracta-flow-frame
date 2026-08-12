# Coding Brief — Phase 2: Triangulation Logic (FunctionHypothesis)

Repo: https://github.com/DaddysCoder/fba-screener
Builds on: Phase 1 MVP (shipped, verified end-to-end)
Status: ready to build

---

## 1. What this phase adds

A computed comparison between the FAST screener's hypothesised function and the pattern emerging from logged episodes — surfaced as agreement/partial match/mismatch with a confidence level, never as a single verdict. This is the core "decision support, not diagnostic" feature — get the display language right, not just the math.

## 2. Data model additions

```ts
interface FunctionHypothesis {
  id: string;
  behaviourId: string;
  computedAt: Date;

  screenerFunctionResult: FunctionDomain[];   // top domain(s) from screener, ties possible
  episodePatternResult: FunctionDomain | null; // dominant consequence tag, or null if no episodes
  episodeCount: number;
  distinctDayCount: number;

  agreementStatus: 'match' | 'partial_match' | 'mismatch' | 'insufficient_data';
  confidenceLevel: 'low' | 'moderate' | 'high';

  // audit trail — required, not optional. Every hypothesis must show its receipts.
  contributingEpisodeIds: string[];
  contributingScreenerIds: string[];
}

type FunctionDomain = 'attention' | 'escape' | 'tangible' | 'automatic';
```

Note the convenient existing alignment: `Episode.consequence` tags and `FunctionScreener.domain_scores` already both use the same four FAST domains (attention/escape/tangible/automatic) — no mapping layer needed between them.

## 3. Computation logic

### 3.1 Screener result
- If one screener exists for the behaviour: top-scoring domain(s) (handle ties — a screener can validly point to more than one domain).
- If multiple screeners exist for the same behaviour (early groundwork for Phase 4, even though multi-informant collection isn't built yet — the schema already allows multiple `FunctionScreener` rows per behaviour): average domain scores across screeners to get the combined result. **Also compute and store inter-rater disagreement as its own flag** if screeners meaningfully diverge from each other — this is a real, useful signal on its own, cheap to add now since the aggregation logic has to exist anyway, and it'll matter a lot once Phase 4 ships.

### 3.2 Episode pattern result
- Tally `consequence` tags across all logged episodes for the behaviour (exclude "none observed").
- Dominant tag = the mode. If no clear mode (tie, or too few episodes), `episodePatternResult` is `null` and `agreementStatus` is `insufficient_data`.

### 3.3 Agreement status
- `match` — episode dominant tag is in the screener's top domain(s)
- `partial_match` — episode dominant tag is a secondary (non-top but present) domain in the screener
- `mismatch` — episode dominant tag doesn't appear in the screener's domains at all
- `insufficient_data` — fewer than 3 episodes, or no clear dominant tag

### 3.4 Confidence level (anchored to the cited methodology, not arbitrary)
- **Low** — fewer than 3 episodes
- **Moderate** — 3–5 episodes, with the dominant consequence tag appearing consistently (plurality) across at least 2 distinct days
- **High** — 5+ episodes, dominant tag consistent, spanning 5+ distinct days

This mirrors the Idaho SDE FBA handbook's 3–6 baseline data point convention and the descriptive-assessment methodology convention (5+ data points across 5+ days) already established in the coding brief.

### 3.5 Recompute trigger
**On-demand only — a practitioner-triggered "Recompute" action, not automatic/live recalculation on every episode save.** This is a deliberate product decision, not a technical shortcut: live recomputation risks reading as automated decision-making rather than decision support. Show a visible "last computed [date/time]" and a clear "recompute" action rather than silently updating in the background.

## 4. UI requirements

- **Never display the hypothesis as a single answer.** The primary UI element is the agreement status (match/partial/mismatch/insufficient data) plus the confidence level — both visible together, always.
- **Mandatory caveat, shown wherever a hypothesis is displayed, regardless of confidence tier:** something to the effect of *"Even a full match between screener and observed pattern is not equivalent to confirmation via experimental functional analysis."* This isn't a one-time disclaimer buried in settings — it belongs next to the result every time it's shown.
- **Audit/receipts view** — clicking into a hypothesis should show exactly which episodes and which screener response(s) fed the computation (`contributingEpisodeIds`, `contributingScreenerIds`), satisfying the Butler v NDIA "must be able to explain it" requirement from the original brief.
- **Escalation nudge (soft, not Phase 3's full automation)** — when `agreementStatus` is `mismatch` or `confidenceLevel` is `low` after a reasonable number of episodes, surface a gentle prompt suggesting descriptive data collection continue, or experimental FA be considered. Full auto-flagging with acknowledgement tracking is Phase 3 — this phase just needs the underlying signal to exist and be visible.

## 5. Test cases to cover

- Zero episodes logged → `insufficient_data`, no crash, clear empty state
- Episodes logged but no screener completed yet → hypothesis blocked/not computable, clear message why
- Screener completed but fewer than 3 episodes → `insufficient_data` with confidence `low`, not silently treated as a match
- Episodes with a tied dominant tag (e.g. exactly 2 attention, 2 escape) → no forced dominant result, treated as insufficient/ambiguous rather than picking one arbitrarily
- Multiple screeners with materially different domain results → disagreement flag fires
- Recompute after adding one new episode → confidence tier changes appropriately (e.g. moderate → high) without needing a full app reload
- All episodes on the same day → capped at whatever confidence tier the distinct-day-count supports, even with a high episode count (guards against someone logging 10 episodes in one afternoon and getting a false "high confidence")

## 6. Explicitly out of scope for this phase

- Automatic escalation/acknowledgement workflow (Phase 3)
- Any cross-informant handoff (Phase 4)
- Any change to the severity/frequency scale or screener item wording (already shipped, stable)
