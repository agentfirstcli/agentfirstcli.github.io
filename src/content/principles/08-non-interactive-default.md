---
number: 8
title: "Non-Interactive Default"
tagline: "Automation over assumption."
category: "Behavior"
---

## Why This Matters

A prompt waiting for `[y/N]` does not time out. It blocks. When a human is at the keyboard, that is fine. When an agent is running the command inside a subprocess, the process hangs until something writes to stdin, which nothing will. The agent eventually hits its own timeout, marks the operation failed, and may retry, which means the blocked process runs again.

`apt install` has `--yes` (`-y`) for exactly this reason. The flag is well-known enough that most automation scripts include it by default. But the fact that you need a flag at all is the problem. Interactive behavior should require a flag, not the other way around. `--interactive` or `--confirm` should unlock prompts; the baseline should be to proceed with documented defaults or fail with a structured error if required input is missing.

Blocking on stdin is not a safety feature in an agentic context. It is a deadlock.

## The Anti-Pattern

```
$ npm init
This utility will walk you through creating a package.json file.
It only covers the most common items, and tries to guess sensible defaults.

See `npm help init` for definitive documentation on these fields
and exactly what they do.

Use `npm install <pkg>` afterwards to install a package and
save it as a dependency in the package.json file.

Press ^C at any time to quit.
package name: (my-project) _
```

The process is now blocked waiting for terminal input.

Problems with this pattern:

- An agent running `npm init` in a subprocess gets no response, because stdin is a pipe, not a terminal
- The preamble text before the first prompt is 7 lines of prose an agent has to skip over
- There is no exit code to distinguish "blocked on input" from "actually failed"
- The agent cannot know which fields will be prompted without reading the source code or docs
- `npm init -y` exists and works fine, which proves the non-interactive path was always available; it just is not the default

A subtler issue: `gcloud` defaults to interactive auth flows in many subcommands. Running `gcloud auth application-default login` in a CI environment opens a browser tab that nothing can interact with, then times out after several minutes. The `--no-browser` flag exists, but you have to know to pass it.

## The Agent-First Way

```
$ npm init --yes
Wrote to /home/user/my-project/package.json:

{
  "name": "my-project",
  "version": "1.0.0",
  "description": "",
  "main": "index.js",
  "scripts": {
    "test": "echo \"Error: no test specified\" && exit 1"
  },
  "keywords": [],
  "author": "",
  "license": "ISC"
}
```

Or, if the tool detects a non-TTY environment and fails cleanly:

```json
{
  "error": {
    "code": "E_REQUIRED_INPUT_MISSING",
    "message": "Non-interactive mode requires --name to be specified",
    "missing_fields": ["name"],
    "hint": "Run with --interactive to use prompts, or pass --name <value>"
  }
}
```

What changed:

- The command completes without blocking
- When required input is truly absent, the tool fails immediately with a structured error listing what is missing
- `--interactive` is the opt-in flag, not `--yes`
- The agent knows exactly what to supply on the next attempt

## For Tool Authors

Check `isatty(stdin)` at startup. Also respect established environment conventions: `CI=true` (widely used by CI systems to signal non-interactive context), `NO_COLOR` (no-color.org standard for disabling ANSI output), and `TERM=dumb` (minimal terminal). If any of these signals is present, treat the session as non-interactive by default. Do not prompt. Either use documented defaults or exit immediately with a structured error listing the missing required values.

If a value has a sensible default, use it silently. If a value has no default and is required, fail with `E_REQUIRED_INPUT_MISSING` and enumerate the missing fields in the error payload. Never block waiting for input that will never arrive.

Provide `--interactive` as an explicit opt-in for the prompt-based flow. This is the safer direction: a human who forgets `--interactive` gets an error they can read; an agent that accidentally gets `--interactive` gets a hung process it cannot recover from.

Document all required and optional inputs in a machine-readable format (your help output, a man page, or a JSON schema for your config). Agents that know the input schema in advance can pre-populate values without trial and error.

## For Agent Builders

Always check whether a tool respects `--yes`, `--no-input`, `--non-interactive`, or reads `CI=true` before running it in automation. Set `CI=true` in the environment for any subprocess that might otherwise prompt. If a tool does not support non-interactive mode at all, wrap it with `expect` or a similar tool only as a last resort, and prefer a different tool that was designed for automation.
