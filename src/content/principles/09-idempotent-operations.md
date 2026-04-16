---
number: 9
title: "Idempotent Operations"
tagline: "Convergence over sequence."
category: "Behavior"
---

## Why This Matters

Agents retry. That is not a bug in how agents work; it is a core property of any system that needs to recover from transient failures. An agent that runs `docker network create my-net`, sees a non-zero exit code, and retries is doing the right thing, unless the failure was "already exists," in which case the retry is pointless and the error is noise.

"Already exists" is not an error from the agent's perspective. The desired state (the network exists) has been reached. The distinction between "I created it" and "it was already there" is irrelevant to the outcome. But most CLIs model creation as a one-shot operation, not a convergence operation, so they return exit code 1 and an error message. The agent logs the failure, retries, fails again, and either gives up or spirals.

`mkdir -p` has had the right idea since 1979. `terraform apply` converges toward declared state rather than failing if resources already exist. These tools work well in automation precisely because they are designed around outcomes, not sequences.

## The Anti-Pattern

```
$ docker network create my-net
my-net

$ docker network create my-net
Error response from daemon: network with name my-net already exists
```

Exit code: `1`

Problems with this pattern:

- The second invocation fails with exit code 1, indistinguishable from a real failure (permission denied, daemon not running, invalid config)
- An agent retrying on failure will loop here indefinitely
- The agent cannot tell from exit code alone whether the network now exists or not
- "Already exists" is treated as an error when it describes successful state convergence
- Any script using `set -e` aborts here, even though the desired outcome was achieved

The same problem appears in `aws ec2 create-security-group`, `kubectl create namespace`, and most `create` subcommands across infrastructure tools. The pattern is pervasive.

## The Agent-First Way

```json
{
  "action": "create",
  "resource": "network",
  "name": "my-net",
  "status": "already_exists",
  "outcome": "ok",
  "id": "3f8a2b1c9d4e"
}
```

Exit code: `0`

Or, for tools that use text output:

```
$ docker network create --idempotent my-net
[exists] my-net (3f8a2b1c9d4e)
```

Exit code: `0`

What changed:

- Exit code 0 signals that the desired state exists, regardless of whether this invocation created it
- `status: "already_exists"` is distinct from `status: "created"`, so a caller that cares about the difference can check the field
- `outcome: "ok"` is the top-level signal for routing: this is not an error
- The resource ID is returned either way, so subsequent operations have what they need

`terraform apply` models this correctly: it computes a diff against current state and applies only what is needed. If nothing needs to change, it exits 0 with "No changes." That is the right abstraction.

## For Tool Authors

Separate the concept of "operation performed" from "desired state achieved." Consider offering explicit convergent verbs: `apply`, `ensure`, or `upsert` for state-convergent operations, while keeping `create` for strict "create only" semantics. This avoids overloading `create` to mean both "fail if exists" and "ensure exists," which confuses both humans and agents. A `create` command should succeed if the resource exists at the end of the call, whether or not this invocation was the one that created it, or the tool should provide a separate `ensure` verb that does. Return a `status` field that distinguishes `created`, `already_exists`, and `updated` for callers that need that information. Reserve non-zero exit codes for actual failures: the resource could not be created, permissions were denied, the request was invalid.

If a full idempotent mode is not feasible immediately, add a flag (`--if-not-exists`, `--idempotent`, `--ignore-existing`) that opts into convergence behavior. Make that flag the recommended default in your documentation for any automation use case.

For `delete` operations, apply the same logic in reverse: deleting a resource that does not exist should exit 0. The desired state (resource absent) is already true. `kubectl delete pod foo --ignore-not-found=true` does this correctly.

Some operations genuinely cannot be made idempotent: sending an email, charging a credit card, appending to an audit log. For these, support an `--idempotency-key <uuid>` flag. The tool stores the key and deduplicates within a defined window. If the same key is seen twice, return the original result with `"replayed": true` in the output instead of executing again. Stripe, AWS, and most payment APIs use this pattern; it works just as well for CLIs.

Also consider providing a `--dry-run` mode that reports what would change without making changes. That lets agents check current state cheaply before deciding whether to act.

## For Agent Builders

When using tools that do not support idempotent operations natively, add a check-before-create pattern: query whether the resource exists, then skip creation if it does. This is more expensive than a true idempotent create, but it avoids spurious failures. Cache the existence check result within a single agent run to avoid redundant queries. When you catch an "already exists" error, log it at debug level and treat it as success rather than propagating it as a failure.
