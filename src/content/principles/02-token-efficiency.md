---
number: 2
title: "Token Efficiency"
tagline: "Signal over noise."
category: "Output"
---

## Why This Matters

An agent's context window is a finite, expensive resource. Every token consumed by decorative CLI output is a token that cannot hold code, reasoning, or task state. This is not a theoretical concern; it is a routine bottleneck.

Run `npm install` on a project with 200 dependencies and you get several thousand lines of output: download progress, extraction logs, audit summaries, funding notices, deprecation warnings about packages you did not ask about, and a final tree of everything installed. If an agent runs this command and includes the full output in its context, it has burned tokens on information it will never act on. The only thing the agent needed to know was whether installation succeeded and whether any packages failed.

CLIs were designed to be watched by humans who can skim. Agents cannot skim; they pay per token for everything they read.

## The Anti-Pattern

```
$ npm install

npm warn deprecated inflight@1.0.6: This module is not supported, and ...
npm warn deprecated glob@7.2.3: Glob versions prior to v9 are no longer ...
npm warn deprecated rimraf@3.0.2: Rimraf versions prior to v4 are no longer ...

added 847 packages, and audited 848 packages in 34s

193 packages are looking for funding
  run `npm fund` for details

8 vulnerabilities (2 moderate, 6 high)

To address issues that do not require attention, run:
  npm audit fix

To address all issues (including breaking changes), run:
  npm audit fix --force

Run `npm audit` for details.
```

What this costs an agent:

- The deprecation warnings repeat the package name, version, and a prose explanation for every deprecated transitive dependency. There may be dozens. None of these are actionable without knowing which of your direct dependencies pulled them in.
- "193 packages are looking for funding" is noise by definition. The npm team knows agents do not donate to open source projects.
- The vulnerability summary duplicates information that `npm audit --json` provides in structured form. The prose here contains no severity scores, no CVE IDs, no affected versions. It is a prompt to run another command.
- The final output of a successful install contains zero indication of what actually changed: which packages were added, which were updated, which were removed.

In a CI pipeline with an agent orchestrating the build, this output is read, tokenized, and discarded after extracting exactly one bit of information: did the exit code indicate success?

## The Agent-First Way

```
$ npm install --json 2>/dev/null
{
  "added": 847,
  "removed": 0,
  "changed": 12,
  "audited": 848,
  "funding": 193,
  "vulnerabilities": {
    "moderate": 2,
    "high": 6
  },
  "elapsed": 34012
}
```

What changed:

- The entire output is one JSON object. An agent reads it in a single parse.
- `added`, `removed`, `changed` tell the agent what happened to the dependency tree. An agent tracking reproducible builds can diff these values against expectations.
- `vulnerabilities` is a map of severity to count. An agent enforcing security policy can check `high > 0` with one comparison.
- Funding notices are absent. They were never signal.
- The deprecation warnings are gone. If an agent needs them, it can request them explicitly.

`docker build` historically emitted layer output like `Step 4/12 : RUN apt-get install -y curl` followed by every line of apt-get output for every layer. `docker build --quiet` suppresses most of it and emits only the final image ID. That one flag can turn 300 lines into 1. The agent needed that image ID; everything else was noise.

## For Tool Authors

Implement a `--quiet` or `--json` flag that suppresses all decorative output. This includes: ASCII art banners, progress bars rendered as text (`[=====>    ] 60%`), spinner frames flushed to stderr, "Done!" confirmation messages, and any output whose sole purpose is to reassure a human watching a terminal.

Warnings and errors should still emit in quiet mode, but they must be structured. A machine-readable warning looks like `{"level":"warn","code":"DEPRECATED","package":"glob@7.2.3"}`, not a paragraph of prose.

Consider what an agent actually needs from your command: the outcome, any identifiers produced (image IDs, resource names, file paths), and errors if they occurred. Everything else is optional and should require opt-in flags to produce.

Progress output belongs on stderr, so it can be suppressed independently. Never mix progress and result data on stdout.

## For Agent Builders

Pipe stderr to `/dev/null` or a log file when you do not need progress output. Use flags like `--quiet`, `--silent`, `--no-progress`, and `--json` to suppress noise at the source. This is cheaper than filtering output after the fact.

When a tool has no quiet mode, capture stdout, check the exit code first, then extract only the lines your agent needs rather than including the full output in context. Log the full output to a file for debugging; do not include it in the agent's reasoning trace.
