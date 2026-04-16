---
number: 13
title: "Stable Flags"
tagline: "Contract over changelog."
category: "Contracts & Stability"
---

## Why This Matters

Agents hardcode flags. When an agent calls a CLI tool, the flag names and their semantics are baked into the agent's tool definition, its system prompt, or its source code. There is no runtime negotiation. The agent passes `--output json` because that is what it was told to pass. If the tool renames that flag to `--format json` in the next release, every agent using the old flag either silently falls back to human-readable output or errors out.

This is not an edge case. `curl` has accumulated decades of flags because it cannot remove or rename them without breaking the enormous amount of automation that depends on them. That stability is not a failure to modernize; it is one of the reasons curl is trusted in automation. The flip side is `tar`, which has notoriously inconsistent flag behavior across platforms: GNU tar and BSD tar accept overlapping but non-identical flag sets, and scripts that work on Linux break on macOS because `tar -xzf` behaves slightly differently in each implementation.

Flag names are a contract. Changing them, even for good reasons, breaks consumers who cannot see your changelog.

## The Anti-Pattern

```bash
# Agent tool definition for a hypothetical log shipper v1.x
log-ship --output /var/log/app.log --recursive

# After upgrading to v2.0:
$ log-ship --output /var/log/app.log --recursive
Error: unknown flag: --recursive
  Did you mean: --recurse?
```

Note: the `log-ship` example above is hypothetical, but the pattern is real. Flag renames happen in real tools across minor or major versions. The illustrative example is used here to avoid misattributing this specific behavior to a named tool.

What breaks here for an agent:

- `--recursive` renamed to `--recurse` is a one-character change that sounds trivial but breaks every agent passing the old flag. The error message is helpful to a human who reads it; an agent parsing exit code and stderr gets an error it cannot recover from automatically.
- The old flag name does not appear in `--help` output. An agent has no way to discover that `--recursive` no longer works except by running it and failing.
- Even worse than a rename is a silent semantic change: a flag keeps its name but does something different. There is no error at all. The agent continues running, confident its configuration is correct, while producing subtly different behavior. This is the hardest class of breakage to detect.

## The Agent-First Way

```bash
# curl: flags from 1998 still work in 2026
curl --silent --output /dev/null --write-out "%{http_code}" https://example.com

# gh: new flags added, old ones kept, and the version is queryable
$ gh --version
gh version 2.47.0 (2024-03-15)

$ gh api repos/cli/cli --jq '.default_branch'
main

# kubectl: deprecated flags warn loudly and early, stay working through the deprecation window
$ kubectl run --generator=run-pod/v1 my-pod --image=nginx
Flag --generator has been deprecated, has no effect and will be removed in a future version.
pod/my-pod created
```

What these tools do right:

- `curl` keeps every flag it has ever shipped. New flags are additions, not replacements. The cost is accumulated surface area; the benefit is that a curl command written in 2005 still works today, which is why it appears in so many provisioning scripts and agent tool definitions.
- `gh` versions its releases clearly and uses a `--jq` flag as an explicit, stable interface to structured output rather than relying on human-readable formatting that changes between versions.
- `kubectl` shows a deprecation warning at runtime before removing the flag. The warning is printed to stderr (not stdout), includes the removal timeline, and does not break the operation. An agent monitoring stderr can surface this warning to operators before the flag is actually removed.

The model: never remove a flag in a minor version. Deprecate first, warn loudly, remove only in a major version after a documented window. For renamed flags, keep the old name as an alias that emits a deprecation warning.

## For Tool Authors

Keep every flag you have ever shipped unless you are making a breaking major release, and even then, provide a migration guide that lists exact replacements. If you need to rename a flag for consistency, keep the old name as an undocumented alias that works silently. You can remove documentation without removing functionality; that is a safer middle path than a hard removal.

When a flag's semantics need to change, add a new flag with the new behavior and deprecate the old one rather than changing what the existing flag does. `--output-file` and `--output` can coexist. Changing what `--output` means is a breaking change even if the flag name stays the same.

Emit deprecation warnings to stderr as structured JSONL, not prose. An agent parsing stdout for results should not see warning text mixed into its data. A structured deprecation warning looks like:

```json
{"level":"warn","code":"FLAG_DEPRECATED","flag":"--recursive","replacement":"--recurse","removal_version":"3.0"}
```

This follows the cross-cutting rule (stdout = results, stderr = diagnostics) and lets agents detect scheduled removals programmatically. The same deprecation metadata should also appear in machine-readable help output (Principle 15), so agents can discover upcoming removals without triggering them.

## For Agent Builders

Pin the tool version in your agent's dependencies and test against upgrades explicitly before deploying. An agent that calls an unpinned version of a CLI tool will inherit whatever breaking changes the tool author ships.

When a deprecation warning appears in stderr, surface it as an observation in the agent's output rather than suppressing it. A flag that is working today but scheduled for removal is a future breakage that the agent's operator needs to know about now.
