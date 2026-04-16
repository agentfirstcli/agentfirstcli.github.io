---
number: 15
title: "Signal Danger"
tagline: "Guardrails over good luck."
category: "Safety"
---

## Why This Matters

An agent issuing `rm -rf /var/data/uploads` and an agent issuing `ls /var/data/uploads` look identical from a control-flow perspective. Both are shell commands. Both return output. The difference is that one is irreversible and the other is not, and that difference is currently invisible to anything upstream of the agent.

When an agent runs inside an approval workflow, the human reviewer needs to know which operations are destructive without reading every command line character by character and maintaining their own mental list of dangerous patterns. When an agent has a dry-run mode, it needs to know which operations to simulate rather than execute. Both cases require the same thing: the tool declares its own danger level in machine-readable output, rather than relying on the caller to recognize the word "destroy" in a flag name.

`terraform destroy` prints a warning in orange text and blocks on an interactive confirmation prompt. `kubectl delete namespace production` silently deletes everything in the namespace with no confirmation at all, returning only `namespace "production" deleted` and exit code 0. Both fail agents in different ways: one blocks automation, the other gives no machine-readable signal that a destructive operation just happened.

## The Anti-Pattern

```
$ terraform destroy
Terraform will perform the following actions:

  # aws_instance.web_server will be destroyed
  - resource "aws_instance" "web_server" {
      - ami           = "ami-0c55b159cbfafe1f0"
      - instance_type = "t3.medium"
      ...
    }

Plan: 0 to add, 0 to change, 1 to destroy.

Do you really want to destroy all resources?
  Terraform will destroy all your managed infrastructure, as shown above.
  There is no undo. Only 'yes' will be accepted to confirm.

  Enter a value:
```

```
$ kubectl delete namespace production
namespace "production" deleted
```

What breaks here for an agent:

- `terraform destroy` blocks on an interactive prompt. An agent running with stdin closed or piped gets an error or hangs. The only way to skip the prompt is `--auto-approve`, which removes the safety gate entirely.
- The danger signal is prose: "There is no undo." An agent must parse that sentence and recognize it as a danger indicator, rather than reading a structured field.
- `kubectl delete namespace production` has no confirmation prompt by default and no structured output indicating that it deleted a namespace containing every resource in production. The command returns `namespace "production" deleted` with exit code 0. An agent has no machine-readable signal that this operation was destructive, or how large the blast radius was.
- An approval workflow sitting between the agent and the shell cannot distinguish `kubectl get pods` from `kubectl delete namespace production` without maintaining a hand-curated list of dangerous subcommands. That list is always incomplete.

## The Agent-First Way

```
$ terraform plan --output json
{
  "format_version": "1.2",
  "resource_changes": [
    {
      "address": "aws_instance.web_server",
      "change": {
        "actions": ["delete"],
        "danger": {
          "level": "irreversible",
          "scope": "resource",
          "description": "Terminates EC2 instance. Data on instance store volumes is lost permanently."
        }
      }
    }
  ],
  "summary": {
    "add": 0,
    "change": 0,
    "destroy": 1
  },
  "requires_approval": true
}
```

```
$ kubectl delete namespace production --dry-run=client --output json
{
  "kind": "DeletePreview",
  "namespace": "production",
  "dry_run": true,
  "danger": {
    "level": "irreversible",
    "scope": "namespace",
    "cascade": true,
    "affected_resource_count": 47,
    "affected_resource_types": ["Deployment", "Service", "ConfigMap", "Secret", "PersistentVolumeClaim"]
  },
  "requires_approval": true
}
```

What changed:

- The `danger` field is structured and machine-readable. An agent or approval workflow can check `danger.level == "irreversible"` without parsing prose.
- `requires_approval: true` is an explicit signal that upstream systems should pause for human review before the operation proceeds.
- `dry_run: true` on the kubectl response confirms the operation did not execute. The agent can show this output to a reviewer who can then issue the real command with an approval token.
- `affected_resource_count: 47` tells the reviewer the blast radius before they approve. The human reviewer sees a number, not a list they have to count manually.
- `scope: "namespace"` and `cascade: true` tell an automated policy system that this operation will propagate to child resources, without needing to know kubectl's cascading deletion semantics.

`terraform plan` with `--output json` already goes most of the way here: the `actions` array per resource is machine-readable and `["delete"]` is a clear signal. The gap is that `danger` metadata (irreversibility, blast radius, description) is still missing from the structured output.

## For Tool Authors

Every operation your tool exposes should carry a danger classification in its structured output. At minimum: whether the operation is reversible, what the scope of the effect is (single resource, namespace, account), and whether cascading effects are possible. Use a consistent field name (`danger`, `destructive`, or similar) so agents can check one field rather than analyzing the operation type.

Separate the concepts of "dry run" and "require approval." Dry run means simulate. Require approval means pause for confirmation before executing. Both should be expressible as flags and both should be reflected in the structured output so upstream systems can act on them. Do not conflate them by making `--dry-run` the only way to avoid automatic execution.

If your tool must prompt for confirmation, support a `--confirm-token <token>` pattern: the first call returns a token and danger metadata, and the second call passes the token to actually execute. This gives approval workflows a clean integration point.

## For Agent Builders

Before executing any write operation, check whether the tool supports dry-run output with danger metadata. If it does, run the dry-run first and surface the danger fields to any approval layer before proceeding. If the tool does not have a dry-run mode, treat it as inherently higher-risk and route it through approval regardless of the command name.

Do not maintain a hardcoded list of "dangerous commands." That list is always incomplete, and the cost of a false negative (missing a dangerous command) is much higher than a false positive (over-confirming a safe one). Let the tool tell you what is dangerous, and when the tool does not tell you, default to caution.
