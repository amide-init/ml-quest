# Create a level

A level in ML Quest is **data, not code**: two JSON files plus its text. If your idea fits one of the mechanics the game already has, you can build it without touching `client/src/`. CI then proves your level can be beaten, and that the obvious wrong move can't.

Paths below are relative to `client/`.

## 1. Pick a mechanic

Each level combines an **algorithm** (the model and what the player controls) with an **optimizer** (how the player plays it). These exist today:

| `algorithm.id` | `optimizer.id` | What the player does | Used by |
|---|---|---|---|
| `linear-regression` | `manual` | Drags the two ends of a line (optionally with a loss meter and move budget) | 1-1, 1-2 |
| `linear-regression` | `gradient-descent` | Picks a learning rate and trains; can allow removing points and scaling x | 1-4, 1-8 |
| `linear-regression` | `least-squares` | Removes broken points; the line is always the best fit | 1-6 |
| `multi-linear-regression` | `gradient-descent` | Scales features, picks a learning rate, trains | 1-7 |
| `landscape-2d` | `manual-steps` | Chooses a step size and steps a ball downhill | 1-3 |
| `landscape-2d` | `auto-descent` | Chooses where the ball starts, then rolls it | 1-5 |
| `logistic-regression` | `manual-boundary` | Drags a straight border between two classes | 2-1 |
| `logistic-regression` | `manual-sigmoid` | Sets a sigmoid's slope and threshold | 2-2 |
| `logistic-regression` | `feature-builder` | Chooses input features (x₁, x₂, x₁², x₂², x₁·x₂) and trains | 2-3 |
| `logistic-regression` | `complexity` | Any mix of: polynomial degree, regularization (λ), minority weight, decision threshold; trains, then checks on hidden data | 2-4 … 2-8 |

The exact fields of each are in the Zod schema, `src/models/LevelModel.ts` (datasets in `src/models/DatasetModel.ts`: `linear-noisy`, `linear-multi`, `two-blobs`, `rings`). The easiest start is to copy the level closest to your idea.

If your idea needs a new mechanic, [open a level proposal](https://github.com/amide-init/ml-quest/issues/new?template=level-proposal.yml) first: that needs code (a runner, a scene and a view, ARCHITECTURE.md §6).

## 2. The level file

`content/levels/<world>/<id>.json`, for example `content/levels/w2/w2-l5.json`. The id must match `w<world>-l<level>`.

```jsonc
{
  "schemaVersion": 1,
  "id": "w2-l5",
  "world": 2,
  "level": 5,
  "seed": 211,                       // fixes the generated data: same seed, same level for everyone
  "algorithm": {
    "id": "logistic-regression",
    "dataset": {                     // generated, with a hidden test set the player never sees
      "generator": "two-blobs",
      "trainPerClass": 12,
      "testPerClass": 60,
      "centers": [[-0.7, -0.4], [0.7, 0.4]],
      "spread": 0.75
    },
    "view": { "xMin": -3.25, "xMax": 3.25, "yMin": -2.6, "yMax": 2.6 },
    "optimizer": {
      "id": "complexity",
      "degree": 6,
      "regularization": { "min": 0, "max": 0.3, "step": 0.01, "initial": 0 },
      "learningRate": 0.5,
      "maxEpochs": 2000
    }
  },
  "stars": { /* see step 3 */ },
  "text": {
    "title": "level.w2-l5.title",
    "mission": "level.w2-l5.mission",
    "hints": ["level.w2-l5.hint1", "level.w2-l5.hint2", "level.w2-l5.hint3"],
    "debrief": "level.w2-l5.debrief",
    "notes": {
      "idea": "level.w2-l5.notes.idea",
      "controls": "level.w2-l5.notes.controls",
      "reading": "level.w2-l5.notes.reading"
    },
    "concept": "regularization"
  },
  "authors": ["your-github-name"]
}
```

(Comments are for this guide only; level files are plain JSON.)

## 3. Stars: how the level is judged

Only the evaluator decides pass and stars. You describe the conditions as data:

```json
"stars": {
  "pass":  { "all": [{ "metric": "accuracy_gap", "op": "<", "value": 0.05 },
                     { "metric": "test_accuracy", "op": ">=", "value": 0.85 }] },
  "two":   { "metric": "accuracy_gap", "op": "<=", "value": 0.01 },
  "three": { "all": [{ "metric": "accuracy_gap", "op": "<=", "value": 0.01 },
                     { "metric": "attempt", "op": "<=", "value": 2 }] }
}
```

- A condition is a leaf (`metric`, `op` one of `<` `<=` `>` `>=` `==`, `value`) or `{ "all": [...] }` / `{ "any": [...] }`.
- Stars are cumulative: 2 stars needs `pass` and `two`; 3 stars needs all three. Revealing a hint caps the result at 2 stars.
- Metrics include `steps`, `moves`, `attempt`, `epochs_to_converge`, `final_loss`, `test_loss`, `loss_gap`, `distance_to_global_min`, `speedup`, `points_removed`, `good_points_removed`, `accuracy`, `test_accuracy`, `accuracy_gap`, `min_confidence`, `feature_count`, `recall`, `test_recall`, `precision`, `test_precision`, `f1`, `test_f1` (full list: `src/models/ConditionModel.ts`). `test_…` metrics are measured on the hidden test set, which is what stops memorizing from earning stars.

## 4. Text

All player-facing text is a key, never a literal in the level file.

- `content/locales/en/levels.json`: `mission`, `hint1`–`hint3`, `debrief`, and the three **field notes**.
- `content/locales/en/ui.json`: the `title`, and for a new concept its Codex card: `concept.<id>.term` and `concept.<id>.definition`.

Writing guidance (RULES.md §3):

- **Mission** in game language, short enough to read in about ten seconds.
- **Hints** go nudge → concept → near-solution. The third may give the answer; hints cost the 3rd star.
- **Debrief** names the ML idea in 2–3 sentences: play first, name it after.
- **Field notes** (optional reading, closed by default): *the idea*, *your controls*, *reading the result*. Explain; never give the answer, because notes cost no stars.
- One new idea per level. Bosses combine earlier ideas and add nothing new.

## 5. The solution file

`content/levels/<world>/<id>.solution.json` scripts runs that the **pass-bot** replays through the real game in CI:

```json
{
  "level": "w2-l5",
  "runs": [
    { "name": "finds the sweet spot",
      "expect": { "passed": true, "stars": 3 },
      "commands": [{ "type": "set-hyperparameter", "name": "regularization", "value": 0.02 },
                   { "type": "check" }] },
    { "name": "anti-solution: no regularization, the model memorizes",
      "expect": { "passed": false },
      "commands": [{ "type": "train" }, { "type": "check" }] }
  ]
}
```

- Include at least one run that passes, ideally one per star count.
- If the level has a trap, add an **anti-solution**: the obvious wrong move, which must fail.
- Commands are what the controls send, e.g. `set-hyperparameter` (`learningRate`, `slope`, `threshold`, `degree`, `regularization`, `oversample`), `train`, `check`, `step`, `set-start`, `set-params`, `toggle-point`, `set-scaling`, `set-boundary`, `flip-sides`, `toggle-feature`, and `{ "type": "retry" }` to start a new attempt (for "first check" stars). See `src/models/CommandModel.ts`.

## 6. Tune it

Change the `seed` and dataset until the numbers tell the story you want: the trap should clearly fail, and the pass should need the idea, with a little room so it isn't luck. The levels in `content/levels/` are good references for star ladders. Keep training data small (500 points or fewer) so it stays smooth on a phone.

## 7. Check and play

From `client/`:

```bash
pnpm levels:validate   # schema, and every text key exists
pnpm test:passbot      # your runs pass (and anti-solutions fail) through the real game
pnpm dev               # then open http://localhost:5173/#/w/<world>/l/<level>
```

In development every level is open, so you can play yours directly. Play it end to end, open the field notes, and try it at phone width and with the keyboard. Then open a pull request: one level per pull request, with the "New level" part of the template ticked.
