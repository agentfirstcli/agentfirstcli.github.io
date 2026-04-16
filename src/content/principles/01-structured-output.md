---
number: 1
title: "Structured Output"
tagline: "Data over decoration."
category: "Output"
---

## Why This Matters

Placeholder content to verify the build pipeline works.

## The Anti-Pattern

```
$ git status
On branch main
Changes not staged for commit:
  modified:   src/app.js
```

## The Agent-First Way

```json
{"branch": "main", "staged": [], "unstaged": ["src/app.js"]}
```

## For Tool Authors

Placeholder.

## For Agent Builders

Placeholder.
