# Agent-First CLI

**Your next user won't have eyes.**

16 principles for building command-line tools that serve both humans and machines.

**Read the manifesto: [agentfirstcli.github.io](https://agentfirstcli.github.io)**

## What is this?

AI agents are operating CLI tools at scale: deploying infrastructure, managing repos, orchestrating pipelines. But CLIs were designed for humans: colored output, interactive prompts, decorative tables, ambiguous errors.

Agent-First CLI is a shared contract between CLI tool makers and agent builders. For tool makers, a design checklist. For agent builders, a standard to reference and demand.

## The 16 Principles

| # | Principle | Tagline |
|---|-----------|---------|
| 1 | Structured Output | Data over decoration |
| 2 | Token Efficiency | Signal over noise |
| 3 | Deterministic Ordering | Predictable over pretty |
| 4 | Structured Progress | Events over animations |
| 5 | Partial Failure Output | Partial truth over total silence |
| 6 | Semantic Exit Codes | Meaning over convention |
| 7 | Parseable Errors | Codes over prose |
| 8 | Non-Interactive Default | Automation over assumption |
| 9 | Idempotent Operations | Convergence over sequence |
| 10 | Faithful Dry Run | Simulation over approximation |
| 11 | Graceful Cancellation | Cleanup over corruption |
| 12 | Stable Schema | Contract over convenience |
| 13 | Stable Flags | Contract over changelog |
| 14 | Capability Negotiation | Query over guess |
| 15 | Machine-Readable Help | Introspection over documentation |
| 16 | Signal Danger | Guardrails over good luck |

## For agents

Machine-readable index: [agentfirstcli.github.io/principles.json](https://agentfirstcli.github.io/principles.json)

Each principle is also available as raw markdown at `/principles/<slug>.md`.

## Contributing

If a principle is wrong, incomplete, or missing, open an issue or submit a PR.

- **Propose a new principle:** open an issue explaining the pain point, the anti-pattern, and the fix.
- **Improve an existing principle:** submit a PR against the relevant markdown file in `src/content/principles/`.
- **Report a problem:** open an issue describing what's broken or unclear.

## Tech stack

Astro + Tailwind CSS, deployed to GitHub Pages via GitHub Actions.

```bash
bun install
bun run dev     # http://localhost:4321
bun run build   # static output in dist/
```

## License

Content: [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/). Code: [MIT](https://opensource.org/licenses/MIT).
