---
number: 3
title: "Deterministic Ordering"
tagline: "Predictable over pretty."
category: "Output"
---

## Why This Matters

An agent that runs the same command twice and gets different output cannot tell whether something changed or whether the tool is just returning results in a different order. That ambiguity is expensive. The agent either treats every ordering difference as a meaningful change (false positives, wasted work) or learns to ignore ordering and risks missing real changes (false negatives, bugs).

Both failure modes compound over time. An agent managing infrastructure that calls `terraform plan` twice in the same session and gets resources listed in different orders cannot produce a reliable diff. An agent caching command output to avoid redundant calls cannot safely use the cache if output order is non-deterministic.

The problem is not rare. Go maps iterate in randomized order by design, and many CLI tools are written in Go. Any tool that collects results into a map and iterates to render output will produce different orderings across runs.

## The Anti-Pattern

```
$ terraform plan

Terraform will perform the following actions:

  # aws_security_group.web will be created
  + resource "aws_security_group" "web" { ... }

  # aws_iam_role.lambda will be created
  + resource "aws_iam_role" "lambda" { ... }

  # aws_s3_bucket.assets will be created
  + resource "aws_s3_bucket" "assets" { ... }
```

Run again without any state change:

```
$ terraform plan

Terraform will perform the following actions:

  # aws_s3_bucket.assets will be created
  + aws_s3_bucket" "assets" { ... }

  # aws_iam_role.lambda will be created
  + resource "aws_iam_role" "lambda" { ... }

  # aws_security_group.web will be created
  + resource "aws_security_group" "web" { ... }
```

What breaks here:

- The set of resources planned is identical. The ordering changed because the underlying graph walk used a map iteration with no stable sort applied to the output.
- An agent diffing the two outputs sees 6 lines changed (the resource blocks reordered). It cannot determine without semantic analysis whether this is a real plan change or a display artifact.
- Any test that asserts "the plan contains these resources in this order" becomes flaky. CI pipelines fail intermittently for no infrastructure reason.
- Cached plan output cannot be compared to a fresh plan output to determine whether re-planning is needed.

`ls` without flags has a similar problem on some systems: output order depends on filesystem directory entry order, which changes as files are created and deleted. `ls -1` in a script is a known footgun; `ls -1 | sort` is the workaround most people discover after their first flaky test.

## The Agent-First Way

```
$ terraform plan -json | jq '.resource_changes | sort_by(.address)'

[
  {
    "address": "aws_iam_role.lambda",
    "change": { "action": "create" }
  },
  {
    "address": "aws_s3_bucket.assets",
    "change": { "action": "create" }
  },
  {
    "address": "aws_security_group.web",
    "change": { "action": "create" }
  }
]
```

What changed:

- `terraform plan -json` emits machine-readable output that `jq` can sort reliably.
- `sort_by(.address)` produces alphabetical order by resource address. This is stable: the same resources always produce the same sorted output regardless of internal graph traversal order.
- An agent comparing two runs of this pipeline gets identical bytes when nothing has changed, and meaningful diffs when something has.
- The sort key is explicit and documented. Any agent or human reading the pipeline knows how to reproduce it.

`kubectl get pods` with `-o json` has the same property: pipe it through `jq '.items | sort_by(.metadata.name)'` and you get stable output. The fix is one extra step, but it should not need to be a fix at all. The tool should sort by default.

## For Tool Authors

Sort all list output by a stable key before rendering. For resource lists, sort by name or identifier. For file lists, sort lexicographically. For dependency trees, sort by package name at each level. Do not leave ordering to map iteration, goroutine scheduling, or filesystem readdir order.

If your output has a natural semantic order that differs from alphabetical (chronological logs, dependency-graph order, priority ranking), that is fine. The requirement is stability, not alphabetical sorting. The same inputs must produce the same order across runs. If you cannot guarantee stable ordering (e.g., results from a parallel backend), include the sort key or order basis as a field in the output so consumers can re-sort deterministically.

When implementing `--output json`, apply the same sort. It is common to see tools that sort their human-readable table output but not their JSON output, on the assumption that JSON consumers will sort themselves. Do not make that assumption; agents pay a token cost to sort, and many will not bother.

Document the sort order. If your tool sorts by name ascending, say so in the help text. If your JSON output is sorted, say so in the schema. An agent that knows the output is sorted can use binary search; an agent that does not know must sort defensively.

Avoid sort orders that depend on locale, timezone, or system configuration. Sort bytes, not locale-aware strings. Use UTC timestamps for any time-based ordering.

## For Agent Builders

Never rely on output order from a CLI tool unless the documentation explicitly guarantees it. Treat all list output as unordered and sort it yourself before comparing, caching, or processing.

When building diff-based workflows (comparing plan output, checking for state drift, detecting changes), normalize both sides before comparing: sort, strip timestamps, remove any fields that legitimately vary between runs (run IDs, durations, line numbers in stack traces). The diff you care about is semantic, not textual.
