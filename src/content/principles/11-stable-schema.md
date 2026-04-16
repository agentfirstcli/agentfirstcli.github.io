---
number: 11
title: "Stable Schema"
tagline: "Contract over convenience."
category: "Contracts & Stability"
---

## Why This Matters

When an agent calls `docker inspect` and reads `container[0].NetworkSettings.IPAddress`, it is not calling a function. It is parsing a document with an implicit schema. Every field name, every nesting level, and every value type is something the agent's code depends on. Change any of them and the agent breaks, silently or loudly depending on how the code was written.

The schema of machine-readable output is an API contract. It does not matter that the output comes from a CLI rather than an HTTP endpoint. Consumers depend on it in exactly the same way. But most CLI tools treat their JSON output as an implementation detail: something that reflects the internal data model today and will be refactored when the data model changes.

This is the wrong mental model. Once a machine-readable format is published, it has consumers. Those consumers include agents running in production, CI pipelines, scripts in repositories you have never seen, and integrations written by people who will not find out about your breaking change until their automation fails at 2am.

## The Anti-Pattern

```
# docker inspect output on one daemon version
$ docker inspect my-container | jq '.[0].NetworkSettings.Networks.bridge'
{
  "IPAMConfig": null,
  "Links": null,
  "Aliases": null,
  "NetworkID": "7ea29fc1412292a2d7bba362f9253545fecdfa8ce9a6e37dd10ba8bee7129812",
  "EndpointID": "2cdc4edb1ded3631c81f57966563e5c8525b81121bb3706a9a9a3ae102711f3f",
  "Gateway": "172.17.0.1",
  "IPAddress": "172.17.0.2",
  "IPPrefixLen": 16,
  "IPv6Gateway": "",
  "GlobalIPv6Address": "",
  "GlobalIPv6PrefixLen": 0,
  "MacAddress": "02:42:ac:11:00:02"
}

# Same logical query using Podman (a Docker-compatible runtime)
$ podman inspect my-container | jq '.[0].NetworkSettings'
{
  "EndpointID": "",
  "Gateway": "",
  "IPAddress": "",
  "IPPrefixLen": 0,
  "IPv6Gateway": "",
  "GlobalIPv6Address": "",
  "GlobalIPv6PrefixLen": 0,
  "MacAddress": "",
  "Bridge": "",
  "SandboxID": "",
  "HairpinMode": false,
  "LinkLocalIPv6Address": "",
  "LinkLocalIPv6PrefixLen": 0,
  "Ports": {},
  "SandboxKey": "/run/user/1000/netns/netns-c766254d-..."
}
```

What breaks here for an agent:

- Docker nests network info under `.NetworkSettings.Networks.bridge`. Podman puts fields directly under `.NetworkSettings` with no `Networks` key. An agent written for one runtime fails silently on the other because the path returns `null` instead of erroring.
- New fields appear between versions (`IPAMConfig`, `Links`, `Aliases` in Docker; `HairpinMode`, `SandboxKey` in Podman). An agent checking `if .IPAMConfig` to detect a specific configuration will get `null` on Docker (field present but empty) and a missing key error on Podman.
- There is no schema version field in either output. An agent cannot tell which format it is reading without checking the daemon type and version through a separate call.
- Fields common to both (`IPAddress`, `Gateway`, `MacAddress`) live at different nesting depths. Code that works against one structure fails against the other.

## The Agent-First Way

```
$ docker inspect --format '{{json .NetworkSettings.Networks}}' my-container
```

This is not a solution; it is a workaround. The actual agent-first way is what `kubectl` does with its API versioning:

```
$ kubectl get pods -o json | jq '.apiVersion'
"v1"

$ kubectl get deployments -o json | jq '.apiVersion'
"apps/v1"
```

What this gives an agent:

- Every resource output includes `apiVersion` and `kind`. An agent parsing the output knows exactly which schema it is reading before it reads any data fields.
- The Kubernetes API changelog explicitly marks fields as deprecated before removing them, with the deprecation appearing in the output (e.g., `"deprecated": true` in API discovery responses) before removal in a later version.
- When the schema changes incompatibly, the API version increments: `apps/v1beta1` became `apps/v1`. Agents can branch on version and handle both.
- `kubectl explain pod.spec.containers` documents the current schema in the tool itself, so an agent can query what fields are available before parsing.

No tool gets this perfectly right. The model is: version the schema, document what changed between versions, and never remove a field in a patch release.

## For Tool Authors

Add a `schemaVersion` field to your JSON output. Start at `1`. Increment it when you make any change that removes a field, renames a field, changes a field's type, or reorganizes nesting. Additive changes (new optional fields) do not require a version bump but should be documented. However, note that even additive fields can break strict consumers that reject unknown keys. Document whether your schema contract is permissive (consumers should ignore unknown fields) or strict (every field is part of the contract). Most CLI tools should default to permissive, but the expectation must be explicit.

For tools that evolve quickly, consider supporting an explicit version flag: `--api-version=2024-04-16` or `--schema=v2`. This lets the CLI iterate freely on its output format while giving agents a frozen contract they can pin to. Stripe's API versioning works this way: every request specifies which version of the response format it expects, and the server translates. The same pattern works for CLI output.

Keep old schema versions working for at least two major releases. If you need to remove a field, mark it deprecated first: include it in output alongside the new field, and document the timeline for removal. Agents can then detect the deprecated field and warn their operators.

Do not reorganize your output structure for cosmetic reasons. Renaming `container_id` to `containerId` for style consistency is a breaking change. Every agent parsing your output by field name will fail.

## For Agent Builders

Read the schema version field on every parse. Fail explicitly if the version is higher than the highest version your parser handles, so the agent surfaces an "upgrade needed" error rather than silently extracting wrong data from unfamiliar fields.

When writing parsers, access fields by name, never by position. Assert that required fields are present before reading them, and treat missing required fields as an error rather than returning a zero value that looks like valid data.
