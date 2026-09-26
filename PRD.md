# ML Quest — Product Requirements

Sep 26, 2026 · @Amin Uddin

## Overview

ML Quest is a free, open-source browser game where players learn machine learning by training real models to beat levels. Every level is a puzzle: the player tweaks data, parameters or architecture, watches the model learn live, and passes only when the model hits a target.

- **Core promise:** you cannot pass a level by clicking through text. You pass by making a model work.
- **Deployment:** static site on GitHub Pages, no backend, no login, no cost to play.
- **License:** MIT for code, CC BY 4.0 for level content.
- **Working name:** ML Quest (placeholder, to be finalized).

## Goals and success metrics

The v1 goal is a player finishing World 1 who can explain loss, gradient descent and overfitting in their own words.

**Goals**

- Teach core ML intuition through hands-on play, not reading.
- Make every level passable only through correct interaction with a model.
- Run fully in the browser on a mid-range laptop or phone.
- Be easy for contributors to add new levels.

**Non-goals (v1)**

- No accounts, leaderboards server or paywall.
- No heavy math derivations or code-writing levels.
- No training of large models (no GPU requirement).

**Success metrics**

| Metric | Target (3 months after launch) |
| --- | --- |
| Level 1 → Level 5 completion rate | 60% |
| World 1 completion rate | 25% |
| Avg. session length | 12 min |
| GitHub stars | 500 |
| Community-contributed levels merged | 5 |

Metrics come from privacy-friendly analytics (e.g. Plausible or GoatCounter) with no personal data.

## Target users

The primary player is a student or junior developer who knows basic programming but finds ML courses abstract.

| Persona | Who | What they need from the game |
| --- | --- | --- |
| Curious student | College student, 18–24, no ML background | Intuition before formulas, short levels, sense of progress |
| Career switcher | Developer moving into ML/AI | Fast mental models of what each technique does and when it fails |
| Teacher | Instructor running an intro ML class | Levels to assign as homework, sandbox for live demos |
| Contributor | ML practitioner or game dev | Clear level format and docs to add their own levels |

## Core game design

Each level is a short loop: see the mission, interact with a live model, hit the target to pass, then get a debrief that names what you just learned.

**Level loop**

1. **Mission card** (10 sec read): a goal in game language, e.g. "Get the robot ball into the valley in under 30 steps."
2. **Play**: the player drags points, moves sliders, toggles layers or draws data. The model trains live and the visuals update every frame.
3. **Check**: the level evaluates a pass condition (accuracy, loss, steps, parameter count).
4. **Result**: pass → stars + debrief; fail → a hint and retry, with no penalty.
5. **Debrief**: 2–3 sentences mapping the game action to the real ML term, plus an optional "go deeper" card.

**Pass and scoring rules**

- 1 star: meet the pass condition.
- 2 stars: meet it efficiently (fewer steps, smaller model, less data).
- 3 stars: meet a bonus constraint, e.g. "also generalize to the hidden test set."
- Every level includes a hidden test set, so memorizing the training data never earns 3 stars. This teaches overfitting through the scoring itself.

**Hints**

- Three tiers: a nudge, a concept reminder, then a near-solution.
- Hints unlock after a failed attempt or 60 seconds of no progress.
- Using hints never blocks passing, only caps stars at 2.

**Progression**

- Worlds unlock in order; levels inside a world unlock one by one.
- Each world ends with a **boss level** that combines every concept in that world.
- Stars unlock cosmetic rewards (robot skins, map themes) and **sandbox tools**.
- Progress saves locally in the browser, with export/import as a JSON code so players can move devices.

**Game feel**

- A small robot mascot ("the Learner") that visibly improves as the model trains.
- Instant feedback: loss curve, decision boundary and predictions animate live.
- Sound and particle effects on pass, toggleable.

## World map and levels

The game has 6 worlds; v1 ships World 1 and World 2 fully (16 levels), the rest follow in later releases.

| World | Theme | Concepts | Release |
| --- | --- | --- | --- |
| 1. Valley of Loss | Hills and valleys | Data, loss, gradient descent, learning rate | v1 |
| 2. Boundary Plains | Territories to divide | Linear/logistic regression, classification, overfitting, regularization | v1 |
| 3. Forest of Trees | Branching paths | Decision trees, random forests, bias vs variance | v2 |
| 4. Neuron City | Circuits and wires | Perceptrons, MLPs, activations, backprop | v2 |
| 5. Vision Tower | Pixels and filters | CNNs, convolution, pooling | v3 |
| 6. Attention Citadel | Words and signals | Embeddings, sequences, attention | v3 |

**World 1: Valley of Loss (v1)**

| # | Level | Player action | Pass condition |
| --- | --- | --- | --- |
| 1 | Draw the Line | Drag a line to fit scattered points | Mean squared error below 5 |
| 2 | Feel the Loss | Move the line and watch the loss meter | Find the lowest-loss position within 20 moves |
| 3 | Roll Downhill | Take manual gradient steps on a loss landscape | Reach the valley in 15 steps or fewer |
| 4 | Too Fast, Too Slow | Set the learning rate slider, then press Train | Converge in under 50 epochs without diverging |
| 5 | Bumpy Terrain | Pick a start point on a landscape with local minima | Reach the global minimum |
| 6 | Dirty Data | Remove outliers that ruin the fit | Test error below target after cleaning |
| 7 | Scale Matters | Toggle feature scaling on two uneven features | Converge 3x faster than the unscaled run |
| 8 | Boss: The Deep Valley | Combine data cleaning, scaling and learning rate | Fit a noisy dataset under a strict step budget |

**World 2: Boundary Plains (v1)**

| # | Level | Player action | Pass condition |
| --- | --- | --- | --- |
| 1 | Split the Kingdom | Place a straight boundary between two classes | Accuracy 90% or higher |
| 2 | Confidence | Tune the sigmoid slope and threshold | Correct class with probability above 0.8 for all points |
| 3 | Not a Straight Line | Add polynomial features to separate curved data | Accuracy 95% or higher |
| 4 | The Overfitter | Pick model complexity on a small dataset | Hidden-test accuracy 85% or higher |
| 5 | Tame It | Tune the regularization slider | Close the gap between train and test accuracy to under 5% |
| 6 | Unfair Data | Rebalance an imbalanced dataset | Recall on the minority class 80% or higher |
| 7 | Read the Matrix | Adjust the threshold using a confusion matrix | Meet a precision and recall pair target |
| 8 | Boss: Border War | Build a classifier for a noisy, imbalanced, curved dataset | Hidden-test F1 score 0.85 or higher |

## Learning design

The rule is play first, name it after: players feel a concept through the level, then the debrief gives it its real name.

- **Concept cards:** after each pass, a card unlocks in the player's "ML Codex" with the term, a one-line definition, the level's key visual and an optional formula.
- **Debrief questions:** one optional multiple-choice question per level ("Why did a high learning rate make the ball bounce?"). Correct answers give a bonus gem, never block progress.
- **Misconception traps:** some levels are designed so the obvious move fails (e.g. maximizing training accuracy in The Overfitter), and the debrief explains why.
- **Sandbox mode:** unlocked after World 1. Free play with any dataset and every tool the player has unlocked, no pass condition. Useful for teachers doing live demos.
- **Accessibility of ideas:** no formulas are required to pass any level; math appears only in "go deeper" cards.

## Functional requirements

| ID | Requirement | Priority |
| --- | --- | --- |
| F1 | World map showing locked, unlocked and completed levels with star counts | Must |
| F2 | Level runner that loads a level from a config file and runs its loop | Must |
| F3 | Live training visualization: loss curve, data points, decision boundary, model state | Must |
| F4 | Interaction widgets: drag points, sliders, toggles, draw-data canvas, layer builder | Must |
| F5 | Pass-condition engine evaluated on train and hidden test sets | Must |
| F6 | Star scoring, 3-tier hints and retry without penalty | Must |
| F7 | Debrief screen and ML Codex of unlocked concept cards | Must |
| F8 | Local save in the browser, plus export/import of progress as a code | Must |
| F9 | Works on desktop and mobile (touch drag, responsive layout) | Must |
| F10 | Sandbox mode with free play | Should |
| F11 | Light and dark themes, sound toggle, reduced-motion setting | Should |
| F12 | Keyboard controls and screen-reader labels on all widgets | Should |
| F13 | Shareable result card ("I beat World 1 with 22 stars") as an image | Could |
| F14 | Multi-language UI (starting with English and Hindi) | Could |

**Non-functional**

- First load under 3 seconds on a 4G connection; each level's model trains at 30+ fps on a mid-range phone.
- Works offline after first visit (PWA).
- No personal data collected; no cookies.

## Technical architecture

Everything runs client-side as a static build deployed to GitHub Pages by GitHub Actions on every push to `main`.

| Layer | Choice | Why |
| --- | --- | --- |
| Framework | React + TypeScript + Vite | Fast static builds, large contributor pool |
| Rendering | SVG/Canvas for 2D plots; PixiJS for game scenes | Smooth animation at 60 fps |
| ML engine | Small hand-written TS models for Worlds 1–2; TensorFlow.js for Worlds 4+ | Tiny models are clearer and fast; TF.js handles neural nets |
| Training loop | Web Worker | Keeps the UI responsive while models train |
| State | Zustand + localStorage | Simple, no backend |
| Levels | One JSON/TS config per level: dataset, widgets, model, pass condition, hints, debrief | Contributors add levels without touching the engine |
| Testing | Vitest for engine; Playwright for a "can every level be passed" bot | Guarantees no level is impossible |
| Deploy | GitHub Actions → GitHub Pages; PWA service worker | Free hosting, offline play |

**Level config shape (sketch)**

```json
{
  "id": "w1-l4",
  "title": "Too Fast, Too Slow",
  "dataset": "linear-noisy-50",
  "model": "linear-regression",
  "widgets": ["learning-rate-slider", "train-button"],
  "pass": { "metric": "epochs_to_converge", "max": 50 },
  "stars": { "two": { "max_epochs": 25 }, "three": { "test_mse_max": 3 } },
  "hints": ["...", "...", "..."],
  "debrief": "concept:learning-rate"
}
```

## Open source and community

The project is free forever to play, with growth driven by community-contributed levels.

- **Repo contents:** README with a GIF of gameplay, CONTRIBUTING.md, a "Create a level" guide, code of conduct, issue templates for bugs and level proposals.
- **Level contribution flow:** propose via issue → build the config → the CI pass-bot checks the level is winnable → review → merge. Contributors are credited on the level's debrief card.
- **Good first issues:** new datasets, hint text, translations, cosmetic skins.
- **Funding (optional, no paywall):** GitHub Sponsors and a "Buy me a coffee" link on the credits screen.

## Roadmap

The first public release (v1, World 1 and 2) is planned about 10 weeks after starting, assuming one developer part-time.

| Phase | Weeks | Scope | Exit criteria |
| --- | --- | --- | --- |
| 0. Prototype | 1–2 | Level runner + World 1 Level 3 (Roll Downhill) end to end | 5 testers pass it and can explain gradient descent |
| 1. Engine | 3–4 | Level config format, widgets, pass engine, stars, hints, save | Any level can be built from config only |
| 2. World 1 | 5–6 | All 8 levels, debriefs, Codex cards, world map | Pass-bot beats every level; playtest completion rate 50%+ |
| 3. World 2 + polish | 7–9 | All 8 levels, sound, mobile, PWA, accessibility basics | Lighthouse score 90+; works on a mid-range Android phone |
| 4. Launch v1 | 10 | Deploy, README, contributor docs, launch posts | Public on GitHub Pages |
| v2 | Later | Worlds 3–4, sandbox mode, Hindi UI | — |
| v3 | Later | Worlds 5–6 | — |

## Risks and open questions

| Risk | Impact | Mitigation |
| --- | --- | --- |
| Levels feel like quizzes, not games | Players drop after Level 2 | Prototype one level first and playtest before building the engine |
| Levels too hard or too easy | Frustration or boredom | Hint tiers, pass-bot, playtest data per level |
| Slow training on phones | Laggy, broken feel | Tiny models, Web Worker, cap dataset sizes |
| Contributors submit inconsistent levels | Uneven quality | Strict config schema, CI checks, level style guide |
| Scope creep into later worlds | v1 never ships | Freeze v1 at 16 levels |

**Open questions**

- [ ] Final name and visual style (pixel art vs clean flat illustration)?
- [ ] Should World 1 require any account or stay fully anonymous?
- [ ] Is Hindi UI a v1 or v2 priority?
