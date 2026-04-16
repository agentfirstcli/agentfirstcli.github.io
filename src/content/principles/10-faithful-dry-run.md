---
number: 10
title: "Faithful Dry Run"
tagline: "Simulation over approximation."
category: "Behavior"
---

## Why This Matters

An agent uses dry-run to make decisions. It runs `terraform plan` to see what will change, then decides whether to proceed. If the plan says "3 resources will change" and the actual apply changes 5, the agent committed to an operation it never consented to.

This is not a theoretical edge case. Terraform itself had this bug: plan output would sometimes omit changes that provider plugins calculated at apply time. An agent reading the plan output would see a clean, bounded set of changes, approve the operation, and watch something unexpected happen during apply. The agent did not make a mistake; the tool lied to it.

Dry-run mode is a promise: "I will show you exactly what the real run will do, minus the side effects." That promise must be kept unconditionally. Approximation is not a dry run; it is a guess with better formatting.

## The Anti-Pattern

```
$ rsync --dry-run --recursive --delete src/ dest/
deleting dest/old-config.yml
>f+++++++++ src/app.py
>f+++++++++ src/utils.py

sent 1,234 bytes  received 42 bytes  2,552.00 bytes/sec
```

What breaks here for an agent:

- `--dry-run` may not faithfully simulate `--checksum` behavior in all rsync versions. The checksum comparison logic can run differently in the dry-run code path than in the real transfer path, meaning a dry run may report files as identical that the real run would transfer. This class of bug (divergent code paths for simulation vs. execution) has been reported in rsync's issue tracker over the years.
- The output includes a bandwidth summary ("sent 1,234 bytes") that refers to the dry-run metadata transfer, not the actual data that would be transferred. An agent reading this to estimate transfer size will be wrong by orders of magnitude.
- Files that would be skipped due to filesystem permission errors during a real run may appear in dry-run output as though they will succeed. The permission check happens at write time, not at planning time.
- No machine-readable format. The agent must parse the `>f+++++++++` prefix notation, which is documented but not versioned.

An agent that approved this rsync job based on the dry-run output may encounter permission errors mid-transfer or find more files transferred than expected.

## The Agent-First Way

```
$ rsync --dry-run --recursive --delete --itemize-changes --out-format="%o %n %l" src/ dest/
del old-config.yml 0
send app.py 14823
send utils.py 6102
```

What changed:

- `--itemize-changes` with `--out-format` produces one line per file in a consistent, parseable format: operation, filename, size in bytes.
- Size in bytes is the actual file size that will be transferred, not a summary of dry-run metadata. An agent can sum the third column to get a real estimate.
- Separating `del` from `send` lets an agent count deletions and additions independently without parsing `>f+++++++++` notation.
- A faithful dry run would also surface permission errors before the real run; the tool author responsibility here is to probe write permissions during planning, not only during execution.

The broader rule: the same code path that executes the operation should handle the dry run, with side effects gated by a single flag. Two divergent code paths will drift.

## For Tool Authors

Run your dry-run and real-run through the same execution path. The only difference should be a guard around the lines that write to disk, make network calls, or send messages. If your dry-run is a separate simulation function, it will inevitably fall out of sync with the real implementation.

Test this explicitly: run dry-run on a known fixture, capture its output, run the real operation, and verify the results match what dry-run predicted. Do this in CI. Any gap between prediction and outcome is a bug in the dry-run implementation.

Not all dry runs are equal, and agents need to know what they're getting. Declare the fidelity level of your dry run in the structured output:

- `"dry_run_level": "syntax"` means local validation only (input parsing, flag checking, config loading). No network calls, no state checks. Fast and safe, but cannot catch permission errors, resource conflicts, or constraint violations.
- `"dry_run_level": "state"` means the tool queried live state (checked the API, read the database, verified permissions) but did not mutate anything. This is what `terraform plan` does. Higher fidelity, but may hit rate limits or require credentials.

If your operation has side effects that genuinely cannot be simulated (a third-party API that provides no sandbox mode, for example), say so in the dry-run output with a machine-readable field: `"unsimulated": true`. An agent can then factor that uncertainty into its decision rather than trusting a guarantee you cannot keep.

Emit dry-run results in the same structured format as real results. An agent should be able to use the same parsing logic for both.

## For Agent Builders

Treat dry-run output as authoritative only if you have verified the tool's faithfulness. Check the tool's changelog and issue tracker for known dry-run discrepancies. When in doubt, run dry-run in a staging environment where a mismatch between plan and apply is recoverable, and compare the predicted and actual state before using the tool in production automation.

If a tool's dry-run has known gaps, document them as explicit risks in the agent's reasoning context so the agent can report uncertainty rather than false confidence.
