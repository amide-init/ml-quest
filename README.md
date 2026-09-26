# ML Quest

**Learn machine learning by training real models to beat levels.** Free, open source, and it runs entirely in your browser.

> 🚧 **Status: pre-alpha.** The design docs are done and the game is being built. Phase 0 is a playable prototype of *World 1 · Level 3 — Roll Downhill*.

Every level is a puzzle. You tweak the data, parameters or architecture, watch the model learn live, and pass only when it hits the target. You can't click through text to win. You win by making a model work.

- 🎮 **Play-first learning:** feel a concept in the level, then learn its real name in the debrief
- 🧠 **Real models:** gradient descent, classification, overfitting and more, trained live in your browser
- 🔒 **No login, no backend, no tracking cookies:** progress is saved locally, and it works offline
- 🧩 **Community levels:** levels are plain JSON, and CI checks that every level can be beaten

**Play:** https://amide-init.github.io/ml-quest/ (live after the first deploy)

## Worlds

| World | Concepts | Release |
|---|---|---|
| 1. Valley of Loss | Data, loss, gradient descent, learning rate | v1 |
| 2. Boundary Plains | Regression, classification, overfitting, regularization | v1 |
| 3. Forest of Trees | Decision trees, random forests, bias vs variance | v2 |
| 4. Neuron City | Perceptrons, MLPs, activations, backprop | v2 |
| 5. Vision Tower | CNNs, convolution, pooling | v3 |
| 6. Attention Citadel | Embeddings, sequences, attention | v3 |

## Development

The app lives in [`client/`](./client) (Vite + React + TypeScript).

```bash
cd client
pnpm install
pnpm dev
```

## Docs

| Doc | What it covers |
|---|---|
| [PRD.md](./PRD.md) | Product requirements: what we build and why |
| [ARCHITECTURE.md](./ARCHITECTURE.md) | How it's built: layers, engine, training, persistence, CI |
| [RULES.md](./RULES.md) | Engineering rules every change follows |
| [AGENTS.md](./AGENTS.md) | Guide for AI coding agents (and a quick orientation for humans) |

Contributing guide and "Create a level" docs are coming before v1 launch.

## License

- **Code:** [MIT](./LICENSE)
- **Level content** (`client/content/`): [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/)
