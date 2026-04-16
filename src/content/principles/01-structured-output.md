---
number: 1
title: "Structured Output"
tagline: "Data over decoration."
category: "Output"
---

## Why This Matters

When a human reads `git status`, they scan the colored text, recognize the patterns from memory, and extract meaning in milliseconds. An agent does something much worse: it reads the raw bytes, tries to parse English prose with a language model, and hopes the formatting hasn't changed since training.

That hope fails constantly. `kubectl get pods` renders a terminal table aligned with spaces. Column widths shift based on pod name length. Headers change between kubectl versions. An agent trying to extract pod status from that output is writing a brittle text scraper inside its reasoning trace, burning tokens on parsing work that a `--output json` flag could eliminate instantly.

CLIs built for humans first, agents second (which is almost all of them) treat structured output as a debugging feature, not a first-class interface.

## The Anti-Pattern

```
$ kubectl get pods
NAME                          READY   STATUS    RESTARTS   AGE
api-server-7d9f8b4c6-xk2p9   1/1     Running   0          2d
worker-5c8d9f7b6-mn3q1        0/1     Pending   3          14m
db-migrations-job-4xw7z       0/1     Error     0          1h
```

What breaks here for an agent:

- Column alignment depends on the longest value in each column. A pod named `my-very-long-deployment-name-7d9f8b4c6-xk2p9` shifts everything and breaks position-based parsing.
- `RESTARTS` is an integer rendered as a string in a space-padded field. Extracting it requires trimming and splitting on runs of spaces.
- `AGE` is a human duration (`2d`, `14m`, `1h`) with no absolute timestamp. An agent cannot compute "when did this start failing" without knowing the current time.
- ANSI color codes may or may not appear depending on whether the terminal is a TTY. Pipe this to a file and get different bytes than reading it interactively.

Every field the agent needs requires parsing logic that will break when output format changes slightly.

## The Agent-First Way

```
$ kubectl get pods --output json
{
  "items": [
    {
      "metadata": { "name": "api-server-7d9f8b4c6-xk2p9" },
      "status": {
        "phase": "Running",
        "containerStatuses": [
          { "ready": true, "restartCount": 0 }
        ],
        "startTime": "2026-04-14T08:23:11Z"
      }
    },
    {
      "metadata": { "name": "worker-5c8d9f7b6-mn3q1" },
      "status": {
        "phase": "Pending",
        "containerStatuses": [
          { "ready": false, "restartCount": 3 }
        ],
        "startTime": "2026-04-16T10:09:44Z"
      }
    }
  ]
}
```

What changed:

- `restartCount` is an integer. No trimming needed.
- `startTime` is RFC 3339. An agent can compute "this pod has been pending for 14 minutes" without guessing what `14m` means.
- Field names are stable across terminal widths and kubectl versions (schema-versioned by the API).
- No ANSI codes. No alignment spaces. No ambiguity.

`kubectl` earns credit here: `--output json`, `--output yaml`, and `--output jsonpath={}` all exist and work well. The lesson is that `terraform plan` used to lack this, and agents working with Terraform infrastructure were forced to parse human prose ("Plan: 3 to add, 1 to change, 0 to destroy") until `terraform show -json` arrived.

## For Tool Authors

Add a `--output` or `--format` flag that emits JSON or JSONL. Make it output to stdout with no decorative framing: no "Output:" header before the JSON block, no trailing summary line after it, just the data.

Do not make structured output an afterthought that only covers the happy path. Error conditions, partial results, and warnings must also appear in the structured output. An agent that gets clean JSON on success but a prose error message on failure still has a brittle interface.

If your tool produces streaming output (a long-running operation with incremental results), JSONL is the right format: one JSON object per line, each line independently parseable. This lets an agent process results incrementally without buffering the entire output.

Version your schema. When field names change, bump a version field inside the output so consumers know what they are reading. `git`'s `--porcelain` format has done this for years: `--porcelain=v1` and `--porcelain=v2` coexist stably.

## For Agent Builders

Always check for a `--json`, `--output json`, or `--format json` flag before writing any output parsing code. If it exists, use it exclusively. If it does not exist, file a bug or feature request and document the fragility in your agent's code.

When structured output is unavailable, constrain the human-readable output as much as possible. Use flags like `--no-color`, `--no-pager`, and `--quiet` to reduce surface area. Parse only the fields you need, assert on them explicitly, and fail loudly when the format changes rather than silently extracting garbage.
