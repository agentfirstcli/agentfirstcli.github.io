---
number: 6
title: "Semantic Exit Codes"
tagline: "Meaning over convention."
category: "Errors & Exit"
---

## Why This Matters

Exit codes are the original structured output. Every Unix process has one. Agents read them before reading stdout. And yet most tools collapse all outcomes into two states: 0 for success, 1 for everything else.

The result is that "nothing found" looks identical to "crashed." An agent running `grep pattern file.log` gets exit code 1 whether the pattern genuinely does not appear in the log or the file does not exist. Those two outcomes require completely different responses. One means "the condition you were checking for is not present." The other means "fix your command or your file path."

`grep` itself actually does this right: exit 0 for match found, exit 1 for no match, exit 2 for actual errors (bad regex, unreadable file). `diff` returns 0 for identical files, 1 for files that differ, and 2 for errors. `curl` has 92 documented exit codes covering everything from DNS failure (6) to SSL certificate problems (60) to operation timeout (28). Most tools ignore this and return 1 for everything.

## The Anti-Pattern

```bash
$ rsync -av ./dist/ user@server:/var/www/
sending incremental file list
./
index.html
app.js

sent 142,822 bytes  received 89 bytes  28,582.20 bytes/sec
total size is 142,671  speedup is 1.00

$ echo $?
0

# Now with a connection failure:
$ rsync -av ./dist/ user@unreachable:/var/www/
ssh: connect to host unreachable port 22: Connection timed out
rsync: connection unexpectedly closed (0 bytes received so far) [sender]
rsync error: unexplained error (code 255) at io.c(228) [sender=3.2.7]

$ echo $?
255

# And with partial transfer:
$ rsync -av ./dist/ user@server:/var/www/  # (connection drops mid-transfer)
rsync error: error in file IO (code 11) at receiver.c(389)

$ echo $?
11
```

`rsync` actually has decent exit codes (it documents 22 of them), but most tools do not. The anti-pattern is what happens when a tool returns 1 for "nothing to sync," 1 for "permission denied," and 1 for "disk full": the agent cannot distinguish a successful no-op from a catastrophic failure. It either retries everything (dangerous) or gives up on everything (wasteful).

Consider `npm install` when a package is not found in the registry. It exits 1. When a package has a version conflict, it exits 1. When the registry is unreachable, it exits 1. These three situations need three different responses: fix the package name, resolve the conflict, or wait and retry. They all look the same to a caller.

## The Agent-First Way

```bash
# A tool with semantic exit codes:
$ deploy --env staging ./dist/

# Exit codes:
# 0: deployed successfully, no changes
# 0: deployed successfully, changes applied (same as no-op? no - use different codes)

# Better:
# 0: success, nothing to do (already up to date)
# 1: success, changes applied
# 2: partial success, some targets failed (see stdout for details)
# 3: validation error in inputs (bad flags, missing config)
# 4: target unreachable (network, auth)
# 5: target reachable but operation rejected (permissions, conflict)
# 6: operation started but interrupted (partial state, needs inspection)
# 127: tool misconfiguration (missing dependency, bad install)
```

```json
{
  "exit_code": 2,
  "exit_meaning": "partial_success",
  "targets": {
    "succeeded": ["web-1", "web-2", "web-3"],
    "failed": ["web-4"]
  }
}
```

An agent reading exit code 2 knows immediately: partial success, read the details. Exit code 4 means retry with backoff (network issue). Exit code 5 means escalate to a human (permissions problem). Exit code 3 means fix the invocation. None of these require parsing stderr.

Document your exit codes in the `--help` output and in `man` pages. An agent building a command does not have access to your README; it has access to what the binary tells it about itself.

## For Tool Authors

Pick a scheme and document it explicitly. The POSIX standard only defines 0 for success and non-zero for failure. The BSD `sysexits.h` defines codes 64-78 for specific error categories (64 for bad command usage, 69 for service unavailable, 75 for temporary failure worth retrying). You do not need to follow `sysexits.h`, but borrowing its retry-vs-permanent distinction is worth doing.

Two rules that will immediately improve things. First, never use exit code 1 for "nothing found" or "no changes." Reserve non-zero codes for conditions that are actually errors from the caller's perspective. If the tool did its job and found nothing, that is exit 0 with structured output saying the result set is empty. Second, separate "caller error" (bad input) from "environment error" (network down, disk full) from "tool error" (bug in the tool itself). Those three categories cover most situations and give agents enough signal to decide whether to fix the command, retry, or alert.

## For Agent Builders

Treat exit codes as your first signal, not your last resort. Check the code before reading stdout or stderr. Build a table mapping exit codes to actions for each tool you use: which codes mean "retry," which mean "fix and retry," which mean "fail fast," which mean "inspect output before deciding."

When a tool does not document its exit codes, probe it. Run it with intentionally bad inputs and with inputs that produce empty results. Record what exit codes come back. That knowledge is worth encoding explicitly rather than re-learning each time the agent encounters an unexpected outcome.
