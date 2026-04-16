# Agent-First CLI Manifesto Site Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build and deploy a static manifesto site presenting 15 principles for agent-first CLI design, hosted at agentfirstcli.github.io.

**Architecture:** Astro static site with Tailwind CSS. Markdown content files for each principle rendered through shared layouts. GitHub Actions for automated deployment to GitHub Pages. Terminal Native visual theme (dark background, monospace headings, green/amber accents).

**Tech Stack:** Astro 5.x, Tailwind CSS 4.x, Bun, GitHub Actions, GitHub Pages

**Spec:** `docs/superpowers/specs/2026-04-16-agent-first-cli-manifesto-design.md`

---

## File Map

```
astro.config.mjs              — Astro config with Tailwind + site URL
package.json                   — Dependencies and scripts
tsconfig.json                  — TypeScript config (Astro default)
src/content.config.ts          — Content collection schema for principles
src/styles/global.css          — Tailwind directives + Terminal Native theme
src/layouts/BaseLayout.astro   — HTML shell, meta tags, OG tags, nav, footer
src/layouts/PrincipleLayout.astro — Principle page wrapper (prev/next nav, frontmatter display)
src/pages/index.astro          — Landing page with preamble + card grid
src/pages/about.astro          — About page
src/pages/principles/[...slug].astro — Dynamic route for principle pages
src/content/principles/        — 15 markdown files (01-structured-output.md through 15-signal-danger.md)
public/favicon.svg             — Terminal-style favicon
.github/workflows/deploy.yml   — GitHub Actions workflow for Pages deployment
.gitignore                     — Node modules, dist, .superpowers
```

---

### Task 1: Scaffold Astro Project

**Files:**
- Create: `package.json`
- Create: `astro.config.mjs`
- Create: `tsconfig.json`
- Create: `.gitignore`

- [ ] **Step 1: Initialize package.json**

```json
{
  "name": "agent-first-cli",
  "type": "module",
  "version": "0.0.1",
  "scripts": {
    "dev": "astro dev",
    "build": "astro build",
    "preview": "astro preview"
  },
  "dependencies": {
    "astro": "^5.7.0",
    "@astrojs/tailwind": "^6.0.0",
    "tailwindcss": "^4.0.0"
  }
}
```

- [ ] **Step 2: Create astro.config.mjs**

```javascript
import { defineConfig } from 'astro/config';
import tailwind from '@astrojs/tailwind';

export default defineConfig({
  site: 'https://agentfirstcli.github.io',
  integrations: [tailwind()],
});
```

- [ ] **Step 3: Create tsconfig.json**

```json
{
  "extends": "astro/tsconfigs/strict"
}
```

- [ ] **Step 4: Create .gitignore**

```
node_modules/
dist/
.astro/
.superpowers/
```

- [ ] **Step 5: Install dependencies**

Run: `bun install`
Expected: Clean install, `node_modules` created, no errors.

- [ ] **Step 6: Verify Astro runs**

Run: `bunx astro check`
Expected: No errors (may warn about missing pages, that's fine).

- [ ] **Step 7: Commit**

```bash
git init
git add package.json astro.config.mjs tsconfig.json .gitignore bun.lock
git commit -m "feat: scaffold Astro project with Tailwind"
```

---

### Task 2: Terminal Native Theme + Base Layout

**Files:**
- Create: `src/styles/global.css`
- Create: `src/layouts/BaseLayout.astro`
- Create: `public/favicon.svg`

- [ ] **Step 1: Create global.css with Tailwind directives and Terminal Native theme**

```css
@import "tailwindcss";

@theme {
  --color-terminal-bg: #0d1117;
  --color-terminal-surface: #161b22;
  --color-terminal-border: #30363d;
  --color-terminal-text: #c9d1d9;
  --color-terminal-text-secondary: #848d97;
  --color-terminal-green: #7ee787;
  --color-terminal-amber: #ffa657;
  --color-terminal-blue: #79c0ff;
  --color-terminal-red: #ff7b72;
  --font-mono: 'JetBrains Mono', 'Fira Code', 'Cascadia Code', ui-monospace, monospace;
  --font-sans: 'Inter', ui-sans-serif, system-ui, sans-serif;
}

html {
  background-color: var(--color-terminal-bg);
  color: var(--color-terminal-text);
  font-family: var(--font-sans);
}

::selection {
  background-color: var(--color-terminal-green);
  color: var(--color-terminal-bg);
}

/* Code blocks */
pre {
  background-color: var(--color-terminal-surface) !important;
  border: 1px solid var(--color-terminal-border);
  border-radius: 8px;
  padding: 1.25rem;
  overflow-x: auto;
  font-family: var(--font-mono);
  font-size: 0.875rem;
  line-height: 1.7;
}

code {
  font-family: var(--font-mono);
  font-size: 0.875em;
}

:not(pre) > code {
  background-color: var(--color-terminal-surface);
  padding: 0.15em 0.4em;
  border-radius: 4px;
  border: 1px solid var(--color-terminal-border);
}

/* Prose styling for principle content */
.prose h2 {
  font-family: var(--font-mono);
  color: var(--color-terminal-green);
  font-size: 1.25rem;
  margin-top: 2.5rem;
  margin-bottom: 1rem;
}

.prose p {
  line-height: 1.8;
  margin-bottom: 1rem;
}

.prose ul, .prose ol {
  margin-bottom: 1rem;
  padding-left: 1.5rem;
}

.prose li {
  margin-bottom: 0.5rem;
  line-height: 1.7;
}
```

- [ ] **Step 2: Create BaseLayout.astro**

```astro
---
interface Props {
  title: string;
  description?: string;
  ogTitle?: string;
  ogDescription?: string;
}

const { title, description = "15 principles for building CLIs that serve both humans and machines.", ogTitle, ogDescription } = Astro.props;
const fullTitle = title === "Agent-First CLI" ? title : `${title} | Agent-First CLI`;
---

<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <meta name="description" content={description} />
    <meta property="og:title" content={ogTitle || fullTitle} />
    <meta property="og:description" content={ogDescription || description} />
    <meta property="og:type" content="website" />
    <meta property="og:url" content={Astro.url} />
    <link rel="icon" type="image/svg+xml" href="/favicon.svg" />
    <link rel="preconnect" href="https://fonts.googleapis.com" />
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500;700&display=swap" rel="stylesheet" />
    <title>{fullTitle}</title>
    <style>
      @import "../styles/global.css";
    </style>
  </head>
  <body class="min-h-screen bg-terminal-bg text-terminal-text">
    <nav class="border-b border-terminal-border">
      <div class="max-w-4xl mx-auto px-6 py-4 flex items-center justify-between">
        <a href="/" class="font-mono font-bold text-terminal-green hover:text-terminal-amber transition-colors">
          agent-first-cli
        </a>
        <div class="flex gap-6 font-mono text-sm">
          <a href="/" class="text-terminal-text-secondary hover:text-terminal-text transition-colors">principles</a>
          <a href="/about" class="text-terminal-text-secondary hover:text-terminal-text transition-colors">about</a>
          <a href="https://github.com/agentfirstcli/agentfirstcli.github.io" class="text-terminal-text-secondary hover:text-terminal-text transition-colors">github</a>
        </div>
      </div>
    </nav>

    <main class="max-w-4xl mx-auto px-6 py-12">
      <slot />
    </main>

    <footer class="border-t border-terminal-border mt-20">
      <div class="max-w-4xl mx-auto px-6 py-8 text-center text-terminal-text-secondary text-sm font-mono">
        <p>CC BY 4.0 content · MIT code · <a href="https://github.com/agentfirstcli/agentfirstcli.github.io" class="text-terminal-green hover:underline">contribute on github</a></p>
      </div>
    </footer>
  </body>
</html>
```

- [ ] **Step 3: Create favicon.svg (terminal prompt icon)**

```svg
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32">
  <rect width="32" height="32" rx="4" fill="#0d1117"/>
  <text x="4" y="22" font-family="monospace" font-size="18" font-weight="bold" fill="#7ee787">$_</text>
</svg>
```

- [ ] **Step 4: Verify build**

Run: `bunx astro build`
Expected: Build succeeds (may warn about no pages yet).

- [ ] **Step 5: Commit**

```bash
git add src/styles/global.css src/layouts/BaseLayout.astro public/favicon.svg
git commit -m "feat: add Terminal Native theme and base layout"
```

---

### Task 3: Content Collection + Principle Layout

**Files:**
- Create: `src/content.config.ts`
- Create: `src/layouts/PrincipleLayout.astro`
- Create: `src/pages/principles/[...slug].astro`

- [ ] **Step 1: Create content collection schema**

```typescript
import { defineCollection, z } from 'astro:content';

const principles = defineCollection({
  type: 'content',
  schema: z.object({
    number: z.number(),
    title: z.string(),
    tagline: z.string(),
    category: z.string(),
  }),
});

export const collections = { principles };
```

- [ ] **Step 2: Create PrincipleLayout.astro**

```astro
---
import BaseLayout from './BaseLayout.astro';
import { getCollection } from 'astro:content';

interface Props {
  number: number;
  title: string;
  tagline: string;
  category: string;
  slug: string;
}

const { number, title, tagline, category, slug } = Astro.props;

const allPrinciples = await getCollection('principles');
const sorted = allPrinciples.sort((a, b) => a.data.number - b.data.number);
const currentIndex = sorted.findIndex((p) => p.data.number === number);
const prev = currentIndex > 0 ? sorted[currentIndex - 1] : null;
const next = currentIndex < sorted.length - 1 ? sorted[currentIndex + 1] : null;

const description = `Principle ${number}: ${title}. ${tagline}`;
---

<BaseLayout title={`${number}. ${title}`} description={description}>
  <article>
    <header class="mb-12">
      <div class="font-mono text-sm text-terminal-text-secondary mb-2">
        <a href="/" class="hover:text-terminal-green transition-colors">principles</a>
        <span class="mx-2">/</span>
        <span class="text-terminal-amber">{category.toLowerCase()}</span>
      </div>
      <div class="font-mono text-terminal-text-secondary text-lg mb-2">
        {String(number).padStart(2, '0')}
      </div>
      <h1 class="font-mono text-3xl font-bold text-terminal-text mb-3">
        {title}
      </h1>
      <p class="font-mono text-xl text-terminal-green italic">
        {tagline}
      </p>
    </header>

    <div class="prose max-w-none">
      <slot />
    </div>

    <nav class="mt-16 pt-8 border-t border-terminal-border flex justify-between font-mono text-sm">
      {prev ? (
        <a href={`/principles/${prev.id.replace(/^\d+-/, '')}/`} class="text-terminal-text-secondary hover:text-terminal-green transition-colors">
          ← {String(prev.data.number).padStart(2, '0')}. {prev.data.title}
        </a>
      ) : <span />}
      {next ? (
        <a href={`/principles/${next.id.replace(/^\d+-/, '')}/`} class="text-terminal-text-secondary hover:text-terminal-green transition-colors">
          {String(next.data.number).padStart(2, '0')}. {next.data.title} →
        </a>
      ) : <span />}
    </nav>
  </article>
</BaseLayout>
```

- [ ] **Step 3: Create dynamic route for principles**

```astro
---
import { getCollection } from 'astro:content';
import PrincipleLayout from '../../layouts/PrincipleLayout.astro';

export async function getStaticPaths() {
  const principles = await getCollection('principles');
  return principles.map((entry) => ({
    params: { slug: entry.id.replace(/^\d+-/, '') },
    props: { entry },
  }));
}

const { entry } = Astro.props;
const { Content } = await entry.render();
---

<PrincipleLayout
  number={entry.data.number}
  title={entry.data.title}
  tagline={entry.data.tagline}
  category={entry.data.category}
  slug={entry.id.replace(/^\d+-/, '')}
>
  <Content />
</PrincipleLayout>
```

- [ ] **Step 4: Create a placeholder principle to test the pipeline**

Create `src/content/principles/01-structured-output.md`:

```markdown
---
number: 1
title: "Structured Output"
tagline: "Data over decoration."
category: "Output"
---

## Why This Matters

Placeholder content to verify the build pipeline works.

## The Anti-Pattern

\`\`\`
$ git status
On branch main
Changes not staged for commit:
  modified:   src/app.js
\`\`\`

## The Agent-First Way

\`\`\`json
{"branch": "main", "staged": [], "unstaged": ["src/app.js"]}
\`\`\`

## For Tool Authors

Placeholder.

## For Agent Builders

Placeholder.
```

- [ ] **Step 5: Build and verify**

Run: `bunx astro build`
Expected: Build succeeds, `dist/principles/structured-output/index.html` exists.

- [ ] **Step 6: Commit**

```bash
git add src/content.config.ts src/layouts/PrincipleLayout.astro src/pages/principles/\[...slug\].astro src/content/principles/01-structured-output.md
git commit -m "feat: add content collection, principle layout, and dynamic routing"
```

---

### Task 4: Landing Page

**Files:**
- Create: `src/pages/index.astro`

- [ ] **Step 1: Create landing page with preamble and card grid**

```astro
---
import BaseLayout from '../layouts/BaseLayout.astro';
import { getCollection } from 'astro:content';

const principles = await getCollection('principles');
const sorted = principles.sort((a, b) => a.data.number - b.data.number);

const categories = [
  { name: 'Output', principles: sorted.filter(p => p.data.category === 'Output') },
  { name: 'Errors & Exit', principles: sorted.filter(p => p.data.category === 'Errors & Exit') },
  { name: 'Behavior', principles: sorted.filter(p => p.data.category === 'Behavior') },
  { name: 'Contracts & Stability', principles: sorted.filter(p => p.data.category === 'Contracts & Stability') },
  { name: 'Discoverability', principles: sorted.filter(p => p.data.category === 'Discoverability') },
  { name: 'Safety', principles: sorted.filter(p => p.data.category === 'Safety') },
];
---

<BaseLayout title="Agent-First CLI">
  <header class="mb-16">
    <h1 class="font-mono text-4xl md:text-5xl font-bold text-terminal-text mb-3">
      Agent-First CLI
    </h1>
    <p class="font-mono text-xl text-terminal-green italic mb-12">
      Your next user won't have eyes.
    </p>

    <div class="text-lg leading-relaxed space-y-4 max-w-3xl">
      <p>
        <strong class="text-terminal-text">Agents are the new users of your CLI.</strong>
      </p>
      <p>
        Every day, more software is operated by AI agents: deploying infrastructure, managing repos, orchestrating pipelines. These agents consume the same CLI tools humans do. But CLIs were designed for humans: colored output, interactive prompts, decorative tables, ambiguous errors.
      </p>
      <p>
        This worked when every user had eyes and a keyboard. That era is ending.
      </p>
      <p>
        Agent-First CLI is a set of 15 principles for building command-line tools that serve both humans and machines. Not instead of humans, alongside them. A CLI that follows these principles loses nothing for human users and gains an entire class of new consumers that can operate it reliably, efficiently, and safely.
      </p>
      <p>
        The principles are a shared contract: for tool makers, a design checklist. For agent builders, a standard to reference and demand.
      </p>
    </div>
  </header>

  <section>
    {categories.map((cat) => (
      <div class="mb-12">
        <h2 class="font-mono text-sm text-terminal-text-secondary uppercase tracking-wider mb-4">
          {cat.name}
        </h2>
        <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {cat.principles.map((p) => (
            <a
              href={`/principles/${p.id.replace(/^\d+-/, '')}/`}
              class="block border border-terminal-border rounded-lg p-5 hover:border-terminal-green transition-colors group bg-terminal-surface"
            >
              <div class="font-mono text-terminal-amber text-sm mb-2">
                {String(p.data.number).padStart(2, '0')}
              </div>
              <h3 class="font-mono font-semibold text-terminal-text group-hover:text-terminal-green transition-colors mb-2">
                {p.data.title}
              </h3>
              <p class="text-sm text-terminal-text-secondary italic">
                {p.data.tagline}
              </p>
            </a>
          ))}
        </div>
      </div>
    ))}
  </section>
</BaseLayout>
```

- [ ] **Step 2: Dev server smoke test**

Run: `bunx astro dev`
Open: `http://localhost:4321`
Expected: Landing page renders with preamble, card grid shows one card (structured output placeholder), Terminal Native theme visible.

- [ ] **Step 3: Commit**

```bash
git add src/pages/index.astro
git commit -m "feat: add landing page with preamble and principle card grid"
```

---

### Task 5: About Page

**Files:**
- Create: `src/pages/about.astro`

- [ ] **Step 1: Create about page**

```astro
---
import BaseLayout from '../layouts/BaseLayout.astro';
---

<BaseLayout title="About" description="Why Agent-First CLI exists and how to contribute.">
  <article class="prose max-w-none">
    <h1 class="font-mono text-3xl font-bold text-terminal-text mb-8">About</h1>

    <h2>Why This Exists</h2>
    <p>
      AI agents are operating CLI tools at scale, right now. They deploy infrastructure with Pulumi and OpenTofu. They manage repositories with git and gh. They orchestrate pipelines with kubectl and docker. Every week, agents take on more of the work that humans used to do by hand.
    </p>
    <p>
      But the tools they use were built for a different user. A user with eyes who can parse colored tables, interpret progress spinners, and read between the lines of an error message. Agents can't do any of that. They burn tokens on decorative output, guess at error meanings, and break on interactive prompts.
    </p>
    <p>
      Some projects (like <a href="https://github.com/wlami/rtk" class="text-terminal-green hover:underline">RTK</a>) address this with proxy layers that strip noise and restructure output. That works, but it's a band-aid. The real fix is upstream: CLIs should be designed for both audiences from the start.
    </p>
    <p>
      Agent-First CLI captures 15 principles for doing exactly that. It's a shared contract between CLI tool makers and the agent builders who consume their tools.
    </p>

    <h2>Contributing</h2>
    <p>
      This is an open project. If a principle is wrong, incomplete, or missing, open an issue or submit a PR.
    </p>
    <ul>
      <li><strong>Propose a new principle:</strong> open an issue explaining the pain point, the anti-pattern, and the fix.</li>
      <li><strong>Improve an existing principle:</strong> submit a PR against the relevant markdown file in <code>src/content/principles/</code>.</li>
      <li><strong>Report a problem:</strong> open an issue describing what's broken or unclear.</li>
    </ul>
    <p>
      All contributions are welcome. The repo is at <a href="https://github.com/agentfirstcli/agentfirstcli.github.io" class="text-terminal-green hover:underline">github.com/agentfirstcli/agentfirstcli.github.io</a>.
    </p>

    <h2>Maintainer</h2>
    <p>
      Created by <a href="https://github.com/wlami" class="text-terminal-green hover:underline">@wlami</a>.
    </p>

    <h2>License</h2>
    <p>
      Content is licensed under <a href="https://creativecommons.org/licenses/by/4.0/" class="text-terminal-green hover:underline">CC BY 4.0</a>. Site code is licensed under <a href="https://opensource.org/licenses/MIT" class="text-terminal-green hover:underline">MIT</a>.
    </p>
  </article>
</BaseLayout>
```

- [ ] **Step 2: Verify in dev server**

Run: `bunx astro dev`
Open: `http://localhost:4321/about`
Expected: About page renders with origin story, contributing section, maintainer, license.

- [ ] **Step 3: Commit**

```bash
git add src/pages/about.astro
git commit -m "feat: add about page with origin story and contributing guide"
```

---

### Task 6: GitHub Actions Deployment

**Files:**
- Create: `.github/workflows/deploy.yml`

- [ ] **Step 1: Create deployment workflow**

```yaml
name: Deploy to GitHub Pages

on:
  push:
    branches: [main]
  workflow_dispatch:

permissions:
  contents: read
  pages: write
  id-token: write

concurrency:
  group: pages
  cancel-in-progress: true

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - name: Checkout
        uses: actions/checkout@v4

      - name: Setup Bun
        uses: oven-sh/setup-bun@v2

      - name: Install dependencies
        run: bun install --frozen-lockfile

      - name: Build site
        run: bun run build

      - name: Upload artifact
        uses: actions/upload-pages-artifact@v3
        with:
          path: dist/

  deploy:
    needs: build
    runs-on: ubuntu-latest
    environment:
      name: github-pages
      url: ${{ steps.deployment.outputs.page_url }}
    steps:
      - name: Deploy to GitHub Pages
        id: deployment
        uses: actions/deploy-pages@v4
```

- [ ] **Step 2: Verify workflow syntax**

Run: `cat .github/workflows/deploy.yml | head -5`
Expected: Valid YAML, `name: Deploy to GitHub Pages` visible.

- [ ] **Step 3: Commit**

```bash
git add .github/workflows/deploy.yml
git commit -m "ci: add GitHub Actions workflow for Pages deployment"
```

---

### Task 7: Write All 15 Principle Pages (Parallel Subagents)

**Files:**
- Create: `src/content/principles/01-structured-output.md` (overwrite placeholder)
- Create: `src/content/principles/02-token-efficiency.md`
- Create: `src/content/principles/03-deterministic-ordering.md`
- Create: `src/content/principles/04-structured-progress.md`
- Create: `src/content/principles/05-partial-failure.md`
- Create: `src/content/principles/06-semantic-exit-codes.md`
- Create: `src/content/principles/07-parseable-errors.md`
- Create: `src/content/principles/08-non-interactive-default.md`
- Create: `src/content/principles/09-idempotent-operations.md`
- Create: `src/content/principles/10-faithful-dry-run.md`
- Create: `src/content/principles/11-stable-schema.md`
- Create: `src/content/principles/12-stable-flags.md`
- Create: `src/content/principles/13-capability-negotiation.md`
- Create: `src/content/principles/14-machine-readable-help.md`
- Create: `src/content/principles/15-signal-danger.md`

This task dispatches up to 15 subagents in parallel (or batched if needed). Each subagent receives:

1. The principle number, title, tagline, and category
2. The page template (5 sections: Why This Matters, The Anti-Pattern, The Agent-First Way, For Tool Authors, For Agent Builders)
3. The anti-slop checklist (see spec)
4. Guidance on which real CLI tools to reference

Each subagent writes one markdown file to `src/content/principles/`. Target: 500-800 words per file.

**Anti-slop checklist (enforced per file):**
- No em-dashes. Use commas, semicolons, or parentheses.
- No "Not because X, but because Y" pattern.
- No "landscape" / "navigate" / "leverage" / "foster" / "delve" / "tapestry" / "holistic" / "synergy".
- No "In today's fast-paced world..."
- No "As someone who..." introductions.
- No emoji spam.
- No "Let's dive in" / "Here's the thing" / "Game-changer".
- No generic CTAs.
- No bullet points rephrasing the same idea.
- No "I'm thrilled/excited/humbled to announce..."
- Sentences sound like something you'd say out loud.
- At least one specific, concrete example from a real CLI tool.

**Subagent assignments with tool examples:**

| Principle | Real CLI tools to reference |
|-----------|-----------------------------|
| 01 Structured Output | `git status`, `kubectl get pods`, `terraform plan` |
| 02 Token Efficiency | `npm install` (verbose), `docker build` (layer output), `pip install` |
| 03 Deterministic Ordering | `ls`, `terraform plan`, `kubectl get` |
| 04 Structured Progress | `docker pull`, `npm install`, `terraform apply` |
| 05 Partial Failure | `terraform apply`, `ansible-playbook`, `pulumi up` |
| 06 Semantic Exit Codes | `curl`, `grep`, `rsync`, `diff` |
| 07 Parseable Errors | `gcc`, `rustc`, `eslint`, `terraform validate` |
| 08 Non-Interactive Default | `apt install`, `npm init`, `gcloud` prompts |
| 09 Idempotent Operations | `terraform apply`, `mkdir -p`, `docker network create` |
| 10 Faithful Dry Run | `terraform plan`, `rsync --dry-run`, `kubectl apply --dry-run` |
| 11 Stable Schema | `docker inspect`, `kubectl` API versions, `gh` JSON output |
| 12 Stable Flags | `curl` flags across versions, `tar` flag inconsistencies |
| 13 Capability Negotiation | `git` version-dependent features, `docker` API versioning |
| 14 Machine-Readable Help | `git help`, `kubectl explain`, `man` pages |
| 15 Signal Danger | `rm -rf`, `kubectl delete`, `terraform destroy`, `DROP TABLE` |

- [ ] **Step 1: Dispatch subagents for all 15 principles**

Each subagent writes its markdown file with proper frontmatter and all 5 sections.

- [ ] **Step 2: Verify all 15 files exist and build**

Run: `ls src/content/principles/ | wc -l`
Expected: 15

Run: `bunx astro build`
Expected: Build succeeds, 15 principle pages in `dist/principles/`.

- [ ] **Step 3: Run anti-slop check**

Run: `grep -rn "—\|leverage\|delve\|synergy\|holistic\|tapestry\|navigate\|foster\|Let's dive\|Here's the thing\|Game-changer\|fast-paced world\|As someone who\|I'm thrilled\|I'm excited\|I'm humbled" src/content/principles/`
Expected: No matches.

- [ ] **Step 4: Commit**

```bash
git add src/content/principles/
git commit -m "feat: add all 15 agent-first CLI principle pages"
```

---

### Task 8: Final Polish + Build Verification

**Files:**
- Modify: Various (bug fixes from build/visual review)

- [ ] **Step 1: Full build**

Run: `bunx astro build`
Expected: Clean build, no errors, no warnings.

- [ ] **Step 2: Preview and visual review**

Run: `bunx astro preview`
Open: `http://localhost:4321`

Check:
- Landing page: preamble renders, all 15 cards visible in grid, grouped by category
- Click each card: principle page loads with correct content
- Prev/next navigation works on each principle page
- About page renders correctly
- Nav links work (principles, about, github)
- Mobile responsive: cards stack on small screens

- [ ] **Step 3: Verify all principle page URLs**

Run: `ls dist/principles/`
Expected: 15 directories, one per principle slug:
```
structured-output/
token-efficiency/
deterministic-ordering/
structured-progress/
partial-failure/
semantic-exit-codes/
parseable-errors/
non-interactive-default/
idempotent-operations/
faithful-dry-run/
stable-schema/
stable-flags/
capability-negotiation/
machine-readable-help/
signal-danger/
```

- [ ] **Step 4: Final commit**

```bash
git add -A
git commit -m "chore: final polish and build verification"
```

---

## Execution Order

Tasks 1-6 are sequential (each builds on the previous). Task 7 (writing principles) can start after Task 3 is complete (content collection exists). Task 8 runs last after all content is written.

```
Task 1 (scaffold) → Task 2 (theme) → Task 3 (content collection) → Task 4 (landing)
                                            ↓                              ↓
                                      Task 7 (15 principles)         Task 5 (about)
                                            ↓                              ↓
                                      Task 8 (polish) ←────────────────────┘
                                            ↓
                                      Task 6 (CI/CD)
```
