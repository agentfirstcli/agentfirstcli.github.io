---
number: 5
title: "Partial Failure Output"
tagline: "Partial truth over total silence."
category: "Output"
---

## Why This Matters

Infrastructure tools rarely succeed or fail atomically. When `terraform apply` runs against 20 resources, it processes them in dependency order. If resource 14 fails, resources 1 through 13 are already created, running, and billing you. The agent needs to know which 13 succeeded before it can make any sensible decision: should it retry the failed resource, roll back the others, or alert a human?

The same applies to `ansible-playbook` across a fleet of servers. If 40 of 50 hosts completed a task before a network partition, the agent needs the list of those 40. Otherwise any retry will re-run on all 50, causing double-execution on the hosts that already completed, which may not be idempotent.

Partial failure output is not about being nice. It is about making recovery possible at all.

## The Anti-Pattern

```
$ terraform apply -auto-approve

Plan: 10 to add, 0 to change, 0 to destroy.

aws_vpc.main: Creating...
aws_subnet.public: Creating...
aws_subnet.private: Creating...
aws_internet_gateway.main: Creating...
aws_route_table.public: Creating...
aws_security_group.web: Creating...
aws_security_group.db: Creating...
aws_db_instance.postgres: Creating...
aws_db_instance.postgres: Still creating... [10s elapsed]
aws_db_instance.postgres: Still creating... [20s elapsed]

Error: creating RDS DB Instance (postgres-prod): InvalidParameterValue:
The parameter MasterUserPassword is not a valid password.

  with aws_db_instance.postgres,
  on main.tf line 94, in resource "aws_db_instance" "postgres":
  94: resource "aws_db_instance" "postgres"

Apply complete! Resources: 7 added, 0 changed, 0 destroyed.
```

Terraform does report the count of successfully created resources here (7 added), which is better than nothing. But the summary line is all an agent gets without running `terraform show -json` or `terraform state list` as separate commands. The error output names the single failing resource but says nothing about which specific seven resources succeeded or what their provider-side IDs are. An agent that needs to roll back those seven resources cannot derive that list from this output alone. It has to run additional commands against the state file, which may itself be locked or corrupted after a partial failure.

## The Agent-First Way

```json
{
  "operation": "apply",
  "status": "partial_failure",
  "exit_code": 1,
  "resources": {
    "succeeded": [
      {"address": "aws_vpc.main", "id": "vpc-0abc1234", "action": "create"},
      {"address": "aws_subnet.public", "id": "subnet-0def5678", "action": "create"},
      {"address": "aws_subnet.private", "id": "subnet-0ghi9012", "action": "create"},
      {"address": "aws_internet_gateway.main", "id": "igw-0jkl3456", "action": "create"},
      {"address": "aws_route_table.public", "id": "rtb-0mno7890", "action": "create"},
      {"address": "aws_security_group.web", "id": "sg-0pqr1234", "action": "create"},
      {"address": "aws_security_group.db", "id": "sg-0stu5678", "action": "create"}
    ],
    "failed": [
      {
        "address": "aws_db_instance.postgres",
        "action": "create",
        "error": "InvalidParameterValue: MasterUserPassword is not a valid password",
        "error_code": "InvalidParameterValue"
      }
    ],
    "skipped": [
      {"address": "aws_instance.web", "reason": "depends_on_failed_resource"},
      {"address": "aws_lb_target_group_attachment.web", "reason": "depends_on_failed_resource"}
    ]
  },
  "summary": {
    "total": 10,
    "succeeded": 7,
    "failed": 1,
    "skipped": 2
  }
}
```

Now an agent knows the blast radius precisely: 7 resources exist and need cleanup if the operation is being rolled back. It knows 2 resources were never attempted. It can retry just `aws_db_instance.postgres` after fixing the password, without touching the 7 that already succeeded. That retry is safe and cheap. A full re-apply without this information risks creating duplicate resources or errors on the already-created VPC.

## For Tool Authors

Report partial results before returning, not after. If your tool writes a summary only at the end and then crashes, the summary never arrives. Emit a result line for each resource as it completes, whether it succeeded or failed. The final summary is a convenience for humans; the per-resource lines are the ground truth for agents.

Include the resource identifier from the provider side (the AWS ID, GCP name, or equivalent) in success records, not just your tool's internal address. An agent trying to verify or clean up a resource needs that ID to make API calls directly.

For skipped resources, explain why. "depends_on_failed_resource" is useful. "skipped" with no reason is not. The agent needs to know whether a skip was intentional (conditional execution) or a cascade from a failure, since those two cases require different recovery actions.

Do not conflate "partial failure" with "total failure" in your exit code. Principle 6 covers exit codes in detail, but the short version is: exit 2 for partial failure, exit 1 for total failure, so callers can branch without parsing your output.

## For Agent Builders

When an operation returns partial failure, write the succeeded list to your working state before doing anything else. That list is your rollback manifest. If the recovery operation also fails, you still know what to clean up.

Do not assume skipped resources are safe to ignore. A resource skipped due to a dependency failure may be in an intermediate state if the dependency was partially created. Check each skipped resource's status individually before retrying.
