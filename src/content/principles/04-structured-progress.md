---
number: 4
title: "Structured Progress"
tagline: "Events over animations."
category: "Output"
---

## Why This Matters

Long-running operations need progress reporting. The question is who that reporting is for. Spinner animations and progress bars are for humans watching a terminal. They work by overwriting lines, using ANSI escape codes, and producing output that, when captured, is garbage.

An agent running `docker pull` or `npm install` cannot tell whether it is 10% done or 90% done. It cannot tell which layer is downloading or which dependency is being resolved. It gets a stream of terminal art it cannot parse. If the operation fails midway, the agent often cannot tell what completed before the failure.

Progress should be a sequence of machine-readable events: timestamped, structured, and parseable without a terminal emulator.

## The Anti-Pattern

```
$ docker pull postgres:16
16: Pulling from library/postgres
a378f10b3218: Pulling fs layer
2a9e37a81c44: Pulling fs layer
a378f10b3218: Downloading [=====>    ]  5.243MB/52.43MB
2a9e37a81c44: Waiting
a378f10b3218: Downloading [==========>]  52.43MB/52.43MB
a378f10b3218: Pull complete
2a9e37a81c44: Downloading [==>   ]  1.2MB/10.8MB
...
Digest: sha256:abc123...
Status: Downloaded newer image for postgres:16
```

Problems here: the progress lines overwrite each other using `\r`, so captured output is interleaved garbage. Layer identifiers are truncated hashes with no stable meaning across runs. There is no timestamp on any event. "Waiting" is not a parseable state. An agent capturing this output cannot answer "which layers succeeded" if the pull fails after downloading three of six.

## The Agent-First Way

```jsonl
{"event":"pull_start","image":"postgres:16","timestamp":"2024-01-15T10:23:01Z"}
{"event":"layer_start","layer":"a378f10b3218","total_bytes":52430000,"timestamp":"2024-01-15T10:23:01Z"}
{"event":"layer_start","layer":"2a9e37a81c44","total_bytes":10800000,"timestamp":"2024-01-15T10:23:01Z"}
{"event":"layer_progress","layer":"a378f10b3218","downloaded_bytes":5243000,"percent":10,"timestamp":"2024-01-15T10:23:03Z"}
{"event":"layer_progress","layer":"a378f10b3218","downloaded_bytes":52430000,"percent":100,"timestamp":"2024-01-15T10:23:08Z"}
{"event":"layer_complete","layer":"a378f10b3218","timestamp":"2024-01-15T10:23:08Z"}
{"event":"layer_progress","layer":"2a9e37a81c44","downloaded_bytes":1200000,"percent":11,"timestamp":"2024-01-15T10:23:09Z"}
{"event":"pull_complete","image":"postgres:16","digest":"sha256:abc123","layers_total":6,"layers_downloaded":6,"timestamp":"2024-01-15T10:23:22Z"}
```

Each line is a complete, parseable event. No line overwrites another. If the process dies after line 5, the agent knows layer `a378f10b3218` completed and `2a9e37a81c44` was 11% done. Recovery and retry logic can use that.

A word of caution: structured progress can easily conflict with [Principle 2 (Token Efficiency)](/principles/token-efficiency/). Per-layer, per-second progress events add up fast. A six-layer pull with percentage updates every second generates hundreds of JSON lines, most of which an agent will never act on. Progress events should be opt-in (a `--progress` or `--verbose-progress` flag), not bundled into the default `--json` output. When enabled, prefer milestone events (start, complete, error) over continuous percentage ticks. If you do emit percentage updates, throttle them: one event per 10% or per 5 seconds, not per byte received.

## For Tool Authors

Structured progress has two implementation constraints worth knowing up front.

First, emit to stdout, not stderr. Many agents capture stdout and discard stderr. Progress events belong on stdout when `--json` or a structured mode flag is active.

Second, do not suppress progress when output is not a TTY. The common pattern of "if not a TTY, show nothing" leaves agents with no progress information at all. Instead: if output is not a TTY (or a `--json` flag is set), switch from ANSI animations to newline-delimited JSON events. Terraform does this correctly when you set `TF_LOG` to `JSON`: every plan step becomes a structured log line rather than a colored box-drawing character.

Include at minimum: `event` type, a stable resource or item identifier, completion percentage or bytes, and a timestamp. Percentage alone is rarely enough; agents also need to know which specific item is at that percentage so they can correlate failures to specific resources.

Keep progress opt-in. Default `--json` output should contain only the final result. A separate `--progress` flag (or `--json --verbose`) enables the event stream. This respects Principle 2: agents that don't need progress shouldn't pay for it in tokens.

## For Agent Builders

When consuming progress streams, treat each JSON line as an independent event and build state from the sequence. Do not try to parse the final summary line alone; it may not arrive if the process crashes.

Set a timeout per-event rather than a total-operation timeout. If no new event arrives for 60 seconds, that is more informative than "the operation has been running for 10 minutes." And always capture the last known state before killing a timed-out process; it tells you how far you got.
