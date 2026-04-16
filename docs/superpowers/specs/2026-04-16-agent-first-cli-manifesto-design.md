# Agent-First CLI Manifesto — Design Spec

## Overview

A public static site presenting 15 principles for building command-line tools that serve both humans and AI agents. Modeled after the 12-factor app methodology: authoritative, referenceable, actionable.

**Name:** Agent-First CLI
**Tagline:** "Your next user won't have eyes."
**URL:** https://agentfirstcli.github.io
**Repo:** agentfirstcli/agentfirstcli.github.io
**Maintainer:** @wlami

## Core Thesis

Tool makers need to treat agents as first-class consumers, not afterthoughts. Proxy solutions like RTK address the symptom (token waste from human-oriented output), but the fix belongs upstream, in how CLIs are designed from day one.

## Audience

A shared contract between two groups:
- **CLI tool authors/maintainers** (Pulumi, OpenTofu, gh, kubectl, etc.): "here's how to make your tool agent-native"
- **Agent/AI tooling developers** (building agents that consume CLIs): "here's what to demand from tools"

## Scope

CLI tools and their surrounding ecosystem: stdout/stderr output, exit codes, config file formats, error messages, version output, help text, flag semantics. Not REST APIs or file format specs (those have their own design traditions).

## Decisions Log

| # | Decision | Options Considered | Choice | Rationale |
|---|----------|--------------------|--------|-----------|
| D1 | Core thesis | A) Token waste B) No shared vocabulary C) Tool makers unaware D) Other | C) Tool makers don't realize agents are primary consumers | A is a symptom addressable by proxies like RTK; C is the root cause |
| D2 | Audience | A) Tool authors B) Agent builders C) Both D) Broader community | C) Shared contract between both | Principles need to be actionable from both sides of the interface |
| D3 | CLI scope | A) Strict CLI B) CLI + ecosystem C) All interfaces | B) CLI + surrounding ecosystem | CLI alone too narrow (config, exit codes matter); all interfaces too diluted |
| D4 | Voice/structure | A) Numbered principles B) Values ("X over Y") C) Problem/solution pairs | A with "over" statement openers | 12-factor backbone for reference quality, "over" openers for memorability |
| D5 | Name + tagline | Multiple candidates brainstormed | "Agent-First CLI" / "Your next user won't have eyes." | Clear, SEO-friendly brand; tagline is memorable and slightly unsettling |
| D6 | Principle count | Open | 15 | Comprehensive enough to cover all themes, bounded enough to be memorable |
| D7 | Security principles | Separate or merged | Merged into single "Signal Danger" principle | Destructiveness + permission scoping collapse into one concept; dry-run kept separate for operational importance |
| D8 | Principle depth | A) Concise B) Deep with examples C) Layered | B) 500-800 words, before/after examples, anti-patterns | Manifesto needs to persuade, not just declare; tool makers need to see their own anti-patterns |
| D9 | Approach | A) Pure static B) Static + audit tool C) Community platform | A) Pure static site | The manifesto is the product. Ship principles first, features later if it resonates |
| D10 | Site structure | — | Landing page + 15 principle pages + about page | 12-factor model: sharp landing, one page per principle |
| D11 | Principle listing on landing | Numbered list vs grid | Grid/gallery of cards | More visual, invites browsing, avoids implying priority order |
| D12 | Static site generator | Hugo, plain HTML, Astro | Astro | Content collections, zero JS output, clean markdown-to-page pipeline |
| D13 | Hosting | Various | GitHub Pages + Actions | Free, matches GitHub-native audience, simple CI |
| D14 | Styling | Plain CSS vs Tailwind | Tailwind CSS | Faster development, consistent utilities, pragmatic over symbolic |
| D15 | Principle titles + taglines | Iterated on 12, 14, 15 | Final list below | Each tagline follows "X over Y" pattern, names the tension concretely |
| D16 | Landing page preamble | Drafted and approved | See Landing Page section | Sets context, names the shift, frames dual audience |
| D17 | Visual direction | A) Terminal Native B) Clean Technical C) Brutalist | A) Terminal Native (dark bg, monospace, green/amber) | Manifesto about CLIs should feel like one; authentic to the audience |
| D18 | Principle page template | Various structures | 5 sections: Why / Anti-Pattern / Agent-First Way / For Tool Authors / For Agent Builders | Dual-audience structure, before/after examples as persuasion core |
| D19 | About page | — | Origin story, contribute link, CC BY 4.0 content / MIT code, @wlami credited | Standard open-source manifesto setup |
| D20 | Hosting URL | Custom domain vs GitHub Pages | agentfirstcli.github.io | Free, matches GitHub org, no domain needed |
| D21 | Repo | — | agentfirstcli/agentfirstcli.github.io | GitHub org pages convention |
| D22 | Content authoring | Phased vs all at once | All 15 written by subagents in parallel | Speed over sequential perfection |
| D23 | Anti-slop checklist | — | 13-point quality gate on all content | No AI-generic writing; specific, human-sounding |
| D24 | Phasing | Phase 1/2/3 vs ship all | Ship all 15 at once | User wants to move fast, subagents enable parallel writing |

## Tech Stack

- **Framework:** Astro (content collections, zero JS output)
- **Styling:** Tailwind CSS
- **Hosting:** GitHub Pages via GitHub Actions
- **Content format:** Markdown with YAML frontmatter
- **License:** CC BY 4.0 (content), MIT (site code)

## Site Structure

```
/                              → Landing page
/principles/structured-output/
/principles/token-efficiency/
/principles/deterministic-ordering/
/principles/structured-progress/
/principles/partial-failure/
/principles/semantic-exit-codes/
/principles/parseable-errors/
/principles/non-interactive-default/
/principles/idempotent-operations/
/principles/faithful-dry-run/
/principles/stable-schema/
/principles/stable-flags/
/principles/capability-negotiation/
/principles/machine-readable-help/
/principles/signal-danger/
/about/
```

## File Structure

```
src/
  content/
    principles/
      01-structured-output.md
      02-token-efficiency.md
      03-deterministic-ordering.md
      04-structured-progress.md
      05-partial-failure.md
      06-semantic-exit-codes.md
      07-parseable-errors.md
      08-non-interactive-default.md
      09-idempotent-operations.md
      10-faithful-dry-run.md
      11-stable-schema.md
      12-stable-flags.md
      13-capability-negotiation.md
      14-machine-readable-help.md
      15-signal-danger.md
  layouts/
    PrincipleLayout.astro
    BaseLayout.astro
  pages/
    index.astro
    about.astro
    principles/[...slug].astro
  styles/
    global.css
public/
  og-image.png
astro.config.mjs
tailwind.config.mjs
package.json
```

## Landing Page

### Preamble

> **Agents are the new users of your CLI.**
>
> Every day, more software is operated by AI agents: deploying infrastructure, managing repos, orchestrating pipelines. These agents consume the same CLI tools humans do. But CLIs were designed for humans: colored output, interactive prompts, decorative tables, ambiguous errors.
>
> This worked when every user had eyes and a keyboard. That era is ending.
>
> Agent-First CLI is a set of 15 principles for building command-line tools that serve both humans and machines. Not instead of humans, alongside them. A CLI that follows these principles loses nothing for human users and gains an entire class of new consumers that can operate it reliably, efficiently, and safely.
>
> The principles are a shared contract: for tool makers, a design checklist. For agent builders, a standard to reference and demand.

### Principle Grid

Cards grouped by theme with subtle section headers:

**Output** (5 cards)
**Errors & Exit** (2 cards)
**Behavior** (3 cards)
**Contracts & Stability** (3 cards)
**Discoverability** (1 card)
**Safety** (1 card)

Each card shows: principle number, title, "over" tagline. Links to deep-dive page.

## The 15 Principles

| # | Principle | Tagline | Category |
|---|-----------|---------|----------|
| 1 | Structured Output | Data over decoration | Output |
| 2 | Token Efficiency | Signal over noise | Output |
| 3 | Deterministic Ordering | Predictable over pretty | Output |
| 4 | Structured Progress | Events over animations | Output |
| 5 | Partial Failure Output | Partial truth over total silence | Output |
| 6 | Semantic Exit Codes | Meaning over convention | Errors & Exit |
| 7 | Parseable Errors | Codes over prose | Errors & Exit |
| 8 | Non-Interactive Default | Automation over assumption | Behavior |
| 9 | Idempotent Operations | Convergence over sequence | Behavior |
| 10 | Faithful Dry Run | Simulation over approximation | Behavior |
| 11 | Stable Schema | Contract over convenience | Contracts & Stability |
| 12 | Stable Flags | Contract over changelog | Contracts & Stability |
| 13 | Capability Negotiation | Query over guess | Contracts & Stability |
| 14 | Machine-Readable Help | Introspection over documentation | Discoverability |
| 15 | Signal Danger | Guardrails over good luck | Safety |

## Principle Page Template

Each principle page follows this structure:

### Frontmatter

```yaml
---
number: 1
title: "Structured Output"
tagline: "Data over decoration."
category: "Output"
slug: "structured-output"
---
```

### Sections

1. **Why This Matters** (~100-150 words): What problem this solves for agents. Why current CLIs fail here.

2. **The Anti-Pattern**: Real-world example of human-oriented output that breaks agents. Actual CLI output from real tools (git, terraform, kubectl, etc.) in a code block. Brief annotation of what's wrong.

3. **The Agent-First Way**: Same operation redesigned for agent consumption. Concrete code block showing structured output. Annotation of what changed and why.

4. **For Tool Authors** (~100-150 words): Practical implementation guidance. How to add this to an existing CLI without breaking human users. Flags, conventions, patterns.

5. **For Agent Builders** (~50-100 words): What to look for, what to demand, how to work around tools that don't follow this yet.

**Target length:** 500-800 words per principle page.

## Visual Design

**Direction:** Terminal Native

- Dark background (#0d1117 or similar)
- Monospace typography for headings and code
- Sans-serif for body text (readability)
- Green (#7ee787) and amber (#ffa657) accent colors
- Code blocks as hero elements
- Minimal decoration; content-first

## About Page

- Origin story and motivation
- Maintainer: @wlami
- How to contribute (link to repo, PR guidelines)
- License: CC BY 4.0 (content), MIT (site code)
- Issue templates: "propose a new principle", "improve an existing one"

## Content Quality Gate — Anti-Slop Checklist

Every principle page must pass before publishing:

- [ ] No em-dashes anywhere. Restructure sentences; use commas, semicolons, or parentheses instead.
- [ ] No "Not because X, but because Y" pattern. Restructure the sentence.
- [ ] No "landscape" / "navigate" / "leverage" / "foster" / "delve" / "tapestry" / "holistic" / "synergy"
- [ ] No "In today's fast-paced world..."
- [ ] No "As someone who..." introductions
- [ ] No emoji spam (0-2 max, only if they add meaning)
- [ ] No "Let's dive in" / "Here's the thing" / "Game-changer"
- [ ] No hashtag walls
- [ ] No generic "What do you think?" CTA. If there's a CTA, make it specific.
- [ ] No bullet points that are just AI rephrasing the same idea 5 ways
- [ ] No "I'm thrilled/excited/humbled to announce..."
- [ ] Sentences sound like something you'd actually say out loud
- [ ] The post has at least one specific, concrete example from a real CLI tool

## Implementation Strategy

All 15 principle pages written in parallel using subagents. Each subagent receives:
- The principle's number, title, tagline, and category
- The page template
- The anti-slop checklist
- Examples of real CLI tools relevant to that principle

User reviews all 15, iterates where needed. Site scaffolding (Astro project, layouts, landing page) built separately.
