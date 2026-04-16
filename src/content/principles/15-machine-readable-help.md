---
number: 15
title: "Machine-Readable Help"
tagline: "Introspection over documentation."
category: "Discoverability"
---

## Why This Matters

An agent that does not know about a flag cannot use it. Right now, agents learn about CLI flags one of two ways: they were trained on documentation scraped before the knowledge cutoff, or they parse `--help` output at runtime and hope the prose is consistent enough to extract structure from.

Both are bad. Training data goes stale. A flag added in the last release is invisible to an agent working from weights. Runtime `--help` parsing is brittle; `git log --help` on macOS opens a man page in a pager. `kubectl explain pod.spec.containers` returns prose formatted for terminal width. Neither gives an agent the clean, typed, queryable data it needs to construct a valid command.

The gap matters most for complex commands. `git log` has over 100 flags. An agent building a log query to find commits touching a specific file after a specific date needs to know about `--after`, `--follow`, and `--diff-filter`, along with their accepted types. Prose does not make that easy to get right.

## The Anti-Pattern

```
$ git log --help
GIT-LOG(1)                Git Manual               GIT-LOG(1)

NAME
       git-log - Show commit logs

SYNOPSIS
       git log [<options>] [<revision range>] [[--] <path>...]

OPTIONS
       --follow
           Continue listing the history of a file beyond renames
           (works only for a single file).

       --no-decorate, --decorate[=short|full|auto|no]
           Print out the ref names of any commits that are shown.
           If short is specified, the ref name prefixes refs/heads/,
           refs/tags/ and refs/remotes/ will not be printed...

       --after=<date>, --since=<date>
           Show commits more recent than a specific date.
```

What breaks here for an agent:

- This is a man page opened in a pager. In a non-interactive context, it may block waiting for input, dump raw terminal control codes, or vary its behavior depending on the `PAGER` environment variable and whether stdout is a TTY.
- `--decorate[=short|full|auto|no]` is a mixed optional-value flag. The argument syntax must be inferred from the prose description. There is no machine-readable schema for "this flag takes an optional enum value with these allowed members."
- `--after=<date>` and `--since=<date>` are aliases for the same flag, but nothing in the output marks them as aliases. An agent has to read and understand "See also: --since" in the prose.
- `kubectl explain pod.spec.containers` is somewhat better, returning structured field descriptions, but it covers Kubernetes resource schemas, not the CLI flags used to query or mutate those resources.

## The Agent-First Way

```
$ git log --help --output json
{
  "command": "git log",
  "synopsis": "Show commit logs",
  "arguments": [
    {
      "name": "revision range",
      "required": false,
      "repeatable": true,
      "type": "string"
    },
    {
      "name": "path",
      "required": false,
      "repeatable": true,
      "type": "path",
      "separator": "--"
    }
  ],
  "flags": [
    {
      "names": ["--after", "--since"],
      "type": "string",
      "format": "date",
      "description": "Show commits more recent than this date. Accepts ISO 8601, RFC 2822, and relative formats like '2 weeks ago'.",
      "required": false
    },
    {
      "names": ["--follow"],
      "type": "boolean",
      "description": "Continue listing history beyond renames. Only valid when a single path is specified.",
      "required": false,
      "constraints": ["requires: path (exactly 1)"]
    },
    {
      "names": ["--decorate"],
      "type": "enum",
      "values": ["short", "full", "auto", "no"],
      "default": "auto",
      "optional_value": true,
      "description": "Print ref names of shown commits."
    },
    {
      "names": ["--format", "--pretty"],
      "type": "string",
      "preset_values": ["oneline", "short", "medium", "full", "fuller", "email", "raw", "tformat:", "format:"],
      "description": "Format of commit output. Prefix format: for custom format strings."
    }
  ]
}
```

What changed:

- `--after` and `--since` appear as a single flag entry with multiple names, making the alias relationship explicit.
- The `type` field is machine-readable: `"boolean"`, `"string"`, `"enum"`, `"path"`. An agent can validate a constructed command before running it.
- `--decorate` declares `"optional_value": true` and enumerates exactly which values are accepted. No prose to parse.
- `--format` surfaces its preset values separately from the free-form `format:` prefix, giving an agent enough information to construct a custom format string without trial and error.
- Constraints between flags (`--follow` requires exactly one path argument) are expressed as structured rules.

## For Tool Authors

Add `--help --output json` (or `help <subcommand> --json`) that returns the flag schema as structured data. The minimum useful schema has: flag names (including all aliases), value type, whether the value is required or optional, allowed enum members if applicable, and a description string.

For complex tools, go further. Include environment variables that affect behavior (`GIT_DIR`, `KUBECONFIG`), config file paths the tool reads, authentication prerequisites (which credentials or tokens are needed), mutually exclusive flags (passing `--json` and `--table` together is an error), implied defaults (what happens when a flag is omitted), and deprecation metadata (which flags are scheduled for removal). Syntax-correct commands are not enough; agents need enough context to construct workflow-correct commands.

Do not generate this by parsing your own help text. Write the schema as data (a struct, a config file, whatever fits your build system) and derive both the human-readable help and the machine-readable output from the same source. This keeps them in sync automatically and eliminates the class of bug where `--help` documents a flag that was removed two versions ago.

`kubectl explain` is a good model for resource schemas. Apply the same idea to flags.

## For Agent Builders

Before constructing a command with unfamiliar flags, try `--help --output json` or the equivalent. If the tool does not support machine-readable help, fall back to parsing `--help` text with explicit handling for common patterns (GNU long option format, POSIX short options). When you do parse prose, write tests against the actual `--help` output of a pinned tool version so you know immediately when the format changes upstream.
