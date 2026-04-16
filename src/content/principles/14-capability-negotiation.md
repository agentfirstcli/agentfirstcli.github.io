---
number: 14
title: "Capability Negotiation"
tagline: "Query over guess."
category: "Contracts & Stability"
---

## Why This Matters

When a feature is gated on a minimum tool version, agents currently have two bad options: parse a version string and maintain their own compatibility table, or try the command and hope the error message is parseable enough to recover from.

Neither approach is reliable. `git` acquired `--rebase-merges` in version 2.18. Before that, the flag did not exist. An agent that wants to rebase with merge preservation must either know the git version matrix by heart, or run `git rebase --rebase-merges` and see if it fails. Both paths are brittle. The version matrix goes stale. The try-and-fail approach eats errors that could mean something else.

The right answer is: the tool tells the agent what it can do. Capabilities are queryable data, not implicit knowledge baked into training weights or hardcoded into the agent's logic.

## The Anti-Pattern

```
$ git --version
git version 2.39.2
```

```
$ docker version
Client: Docker Engine - Community
 Version:           24.0.5
 API version:       1.43
 ...
Server: Docker Engine - Community
 Engine:
  Version:          24.0.5
  API version:      1.43 (minimum version 1.12)
  ...
```

What breaks here for an agent:

- `git --version` returns a freeform string. The agent must parse `"2.39.2"` out of prose, split on dots, cast to integers, and compare against a lookup table of "which version added which flag." That table lives in the agent's code or training data, not in git itself.
- `docker version` is slightly better but still requires the agent to cross-reference API version numbers against Docker documentation. The server tells you the minimum API version it accepts; it does not tell you what operations are available at each version.
- Neither tool answers the question an agent actually needs to ask: "Can I use `--format json` with this `docker inspect` invocation, or will the flag be silently ignored?"
- `kubectl` exposes server version via `kubectl version --output json`, but the available API resources and whether a specific resource version is served still requires a separate `kubectl api-resources` call that returns a table, not structured data keyed by resource name.

## The Agent-First Way

```
$ git capabilities --output json
{
  "version": "2.39.2",
  "features": {
    "rebase": {
      "rebase-merges": true,
      "update-refs": true,
      "empty": ["drop", "keep", "ask"]
    },
    "log": {
      "format-placeholders": ["H", "h", "T", "t", "an", "ae", "s", "b"],
      "output-formats": ["json", "porcelain", "porcelain=v2"]
    },
    "push": {
      "signed": ["yes", "no", "if-asked"],
      "force-with-lease": true,
      "atomic": true
    }
  }
}
```

```
$ docker capabilities --output json
{
  "api_version": "1.43",
  "min_api_version": "1.12",
  "features": {
    "buildkit": true,
    "containerd_snapshotter": false
  },
  "resource_types": {
    "container": {
      "inspect_formats": ["json"],
      "filter_fields": ["name", "status", "label", "network"]
    },
    "image": {
      "inspect_formats": ["json"],
      "filter_fields": ["reference", "before", "since", "label"]
    }
  }
}
```

What changed:

- An agent can ask "does this git support `--rebase-merges`?" with a JSON field lookup, not a version number comparison against a table it maintains.
- Supported output formats are declared per-subcommand, not inferred from documentation or trial and error.
- The `filter_fields` list tells the agent exactly which fields it can filter on, so it does not have to test `docker ps --filter foo=bar` and parse the error to find out `foo` is not a valid filter key.
- When the tool is upgraded, the agent re-queries capabilities on the next run. No code changes needed.

## For Tool Authors

Add a `capabilities` subcommand (or a `--capabilities` flag) that emits a machine-readable description of what the current installation supports. The output should be structured (JSON is fine), stable across tool versions, and cover the things that actually vary: supported flags per subcommand, accepted enum values, output format options, and any feature flags that were compiled in or enabled at the server level.

Do not require the agent to reason about version numbers to infer capabilities. The whole point is that the tool knows what it can do, and the agent should ask rather than deduce. `kubectl api-resources --output name` gets close to this for Kubernetes resource types; extend that pattern to flags and output formats as well.

Keep the capabilities response small enough to be useful as context. If the full capability graph is large, support filtering: `git capabilities rebase --output json` should return only rebase-related capabilities.

To reduce maintenance burden, derive the capabilities output from the same source that defines your CLI's parser and command structure. If your flags are defined in a struct, config file, or decorator, generate the capabilities JSON from that definition. A hand-maintained capabilities endpoint will drift from reality within a few releases. A generated one stays in sync automatically.

## For Agent Builders

Before using any version-gated feature, query the tool's capabilities if the tool supports it. Cache the response for the duration of the task (capabilities do not change mid-run). If the tool does not have a capabilities endpoint, document the minimum version required in your agent's code next to the call site, and add a version check at startup that fails loudly rather than silently using a flag that does not exist.
