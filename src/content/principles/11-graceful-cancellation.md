---
number: 11
title: "Graceful Cancellation"
tagline: "Cleanup over corruption."
category: "Behavior"
---

## Why This Matters

Agents cancel operations. A deployment is taking too long, a build is stuck, a query returned enough results. The agent sends SIGINT or SIGTERM and expects the process to exit. What happens next determines whether the agent can continue working or is left debugging corrupted state.

Most CLI tools handle cancellation by crashing. The process receives the signal, the runtime tears down, and whatever was in-flight gets abandoned. If the tool was mid-write to a file, that file is now truncated. If it was streaming JSON to stdout, the output is now invalid (missing closing braces). If it was mid-transaction against a remote API, the transaction state is unknown. The agent is left holding a broken pipe and no structured information about what happened.

`terraform apply` interrupted mid-run leaves resources in a partially applied state. The state file may or may not reflect reality. An agent that killed the process now has to run `terraform refresh` to reconcile, which is an expensive operation that may itself fail.

## The Anti-Pattern

```
$ long-running-deploy --target production
Deploying service api-server... done
Deploying service worker... done
Deploying service scheduler...^C

$ echo $?
130
```

What breaks here for an agent:

- Exit code 130 (128 + SIGINT) tells the agent the process was killed, but nothing about what completed before the kill
- The partial output on stdout is three prose lines. The agent has to parse them to figure out that `api-server` and `worker` deployed but `scheduler` did not
- If the tool was streaming JSON, the output is now invalid: `[{"service":"api-server","status":"deployed"},{"service":"worker","status":"deployed"},{"service":"sch` followed by EOF
- No final event was emitted. The agent cannot distinguish "cancelled cleanly" from "crashed"
- Any temporary resources, lock files, or in-flight transactions are in unknown state

## The Agent-First Way

```json
{"event":"deploy_start","service":"api-server","timestamp":"2026-04-16T10:00:01Z"}
{"event":"deploy_complete","service":"api-server","status":"success","timestamp":"2026-04-16T10:00:12Z"}
{"event":"deploy_start","service":"worker","timestamp":"2026-04-16T10:00:13Z"}
{"event":"deploy_complete","service":"worker","status":"success","timestamp":"2026-04-16T10:00:25Z"}
{"event":"deploy_start","service":"scheduler","timestamp":"2026-04-16T10:00:26Z"}
{"event":"cancelled","signal":"SIGINT","timestamp":"2026-04-16T10:00:30Z","completed":["api-server","worker"],"in_progress":["scheduler"],"not_started":["cron-runner"],"cleanup":"scheduler rollback initiated"}
```

Exit code: 130

What changed:

- JSONL format means every line emitted before cancellation is independently valid. No truncated JSON objects.
- The final `cancelled` event is emitted by the signal handler before exit. It lists what completed, what was in progress, and what was never started.
- `cleanup` field tells the agent what the tool did before exiting (rolled back the in-progress deploy, released locks, closed connections).
- The agent can read the `completed` list and knows exactly what state the system is in without running a separate reconciliation command.

## For Tool Authors

Register signal handlers for SIGINT and SIGTERM. When the signal arrives:

1. Stop accepting new work. Do not start the next item in a batch.
2. Finish or roll back in-progress work if possible within a short timeout (2-5 seconds).
3. Release locks, close connections, flush buffers.
4. Emit a final structured event to stderr summarizing what completed, what was in progress, and what cleanup was performed.
5. Exit with the conventional signal code (128 + signal number).

Use JSONL (one JSON object per line) for streaming output, not a single JSON array. A JSON array requires a closing `]` that will never arrive if the process is killed. JSONL is valid line by line: every complete line the agent received before the signal is parseable.

If your tool writes to files or state stores, ensure writes are atomic (write to temp file, then rename) so a kill mid-write does not corrupt the output.

## For Agent Builders

When cancelling a long-running process, send SIGTERM first and wait 5-10 seconds before sending SIGKILL. SIGTERM gives the tool a chance to run its cleanup handler and emit the final event. SIGKILL is instant death with no cleanup.

After cancellation, read all remaining output from stdout and stderr before closing the pipes. The final cancellation event may still be in the buffer. Parse the `completed` and `in_progress` fields to determine system state without running a reconciliation command.

If the tool does not emit a cancellation event, treat the last complete JSONL line as the last known good state. Anything after that line is unknown and should be verified before the agent acts on it.
