---
number: 7
title: "Parseable Errors"
tagline: "Codes over prose."
category: "Errors & Exit"
---

## Why This Matters

When a human reads an error message, they scan for the key phrase and infer context from the surrounding text. When an agent reads one, it has to parse natural language to extract file path, line number, severity, and what to do next. That parsing is fragile and expensive.

A consistent error schema changes the situation entirely. The agent can extract structured fields directly, route by severity, look up the error code in its knowledge base, and attempt a fix without burning tokens on sentence parsing. `eslint` already does this with `--format json`. `rustc` emits JSON via `--error-format json`. The capability exists. The problem is it usually requires a flag, and prose is still the default.

Error output should be machine-parseable from the start, not opt-in.

## The Anti-Pattern

```
$ terraform validate
╷
│ Error: Reference to undeclared resource
│
│   on main.tf line 14, in resource "aws_instance" "web":
│   14:   subnet_id = aws_subnet.private.id
│
│ A managed resource "aws_subnet" "private" has not been declared in the
│ root module. Did you mean aws_subnet.public?
╵
```

Problems with this output:

- The box-drawing characters (`╷`, `│`, `╵`) break naive line splitting
- "Did you mean..." is buried at the end of a paragraph, not a structured field
- Severity ("Error") is only in the header, not per-message
- No machine-readable error code; the agent has to classify the error type itself
- File and line are readable to humans but not consistently formatted across tools

An agent trying to extract the suggestion "aws_subnet.public" has to parse a full English sentence.

## The Agent-First Way

```json
{
  "errors": [
    {
      "code": "E_UNDECLARED_RESOURCE",
      "severity": "error",
      "file": "main.tf",
      "line": 14,
      "column": 14,
      "message": "Reference to undeclared resource 'aws_subnet.private'",
      "suggestions": ["aws_subnet.public"],
      "docs_url": "https://developer.hashicorp.com/terraform/language/resources/syntax#E_UNDECLARED_RESOURCE"
    }
  ],
  "summary": {
    "error_count": 1,
    "warning_count": 0
  }
}
```

What changed:

- `code` is a stable identifier; agents can key off it without parsing prose
- `suggestions` is a list, not a sentence fragment
- `file`, `line`, `column` are first-class fields, not embedded in a formatted string
- `severity` is explicit on every error, not just in the surrounding UI chrome
- `docs_url` gives the agent a direct path to more information
- The whole thing is valid JSON; no regex gymnastics required

## For Tool Authors

Emit JSON errors when stdout is not a terminal (`isatty(STDOUT_FILENO) == 0`), or when `--format json` (or equivalent) is passed. Allocate stable error codes early, even if the set is small to begin with. Treat them as part of your public API: changing a code is a breaking change.

Include `suggestions` as a list field, not interpolated prose. An agent receiving `["aws_subnet.public", "aws_subnet.private_2"]` can apply a suggestion programmatically. An agent receiving "did you mean aws_subnet.public or aws_subnet.private_2?" has to parse a sentence with ambiguous structure.

Always include `file`, `line`, and `column` as separate numeric fields. Never use a combined string like `main.tf:14:5` as your only representation. Structured fields compose; concatenated strings require splitting that may break on paths with colons.

Severity should be a controlled vocabulary: `error`, `warning`, `info`, `hint`. Anything outside that set forces agents to build their own normalization layer.

## For Agent Builders

Prefer tools that support `--format json` or equivalent. If a tool only emits prose, wrap it with a parser that produces a normalized schema before passing errors to the agent. Normalize severity and extract file/line at the boundary. The rest of your pipeline should never see raw CLI error strings.
