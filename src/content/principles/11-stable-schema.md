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
# docker inspect output, Docker 20.x
$ docker inspect my-container | jq '.[0].NetworkSettings.Networks'
{
  "bridge": {
    "IPAddress": "172.17.0.2",
    "Gateway": "172.17.0.1",
    "MacAddress": "02:42:ac:11:00:02"
  }
}

# Same command after a Docker daemon upgrade
$ docker inspect my-container | jq '.[0].NetworkSettings.Networks'
{
  "bridge": {
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
}
```

What breaks here for an agent:

- The second output contains `IPAddress` in the same location, so a simple lookup still works. But an agent checking `MacAddress` by position (not name) after iterating the object keys will now be reading the wrong field because key order changed.
- The presence of `IPAMConfig: null` and `Links: null` means an agent checking `if .bridge.IPAMConfig` to detect a specific network configuration will now get a false positive on all containers, where before it got no result.
- There is no version field in this output. An agent cannot tell whether it is reading Docker 20 format or Docker 24 format without knowing the daemon version through a separate call.
- Fields like `NetworkID` and `EndpointID` that appear in the newer format are absent from the older one. Code written against the newer format will fail silently on older daemons.

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

Add a `schemaVersion` field to your JSON output. Start at `1`. Increment it when you make any change that removes a field, renames a field, changes a field's type, or reorganizes nesting. Additive changes (new optional fields) do not require a version bump but should be documented.

Keep old schema versions working for at least two major releases. If you need to remove a field, mark it deprecated first: include it in output alongside the new field, and document the timeline for removal. Agents can then detect the deprecated field and warn their operators.

Do not reorganize your output structure for cosmetic reasons. Renaming `container_id` to `containerId` for style consistency is a breaking change. Every agent parsing your output by field name will fail.

## For Agent Builders

Read the schema version field on every parse. Fail explicitly if the version is higher than the highest version your parser handles, so the agent surfaces an "upgrade needed" error rather than silently extracting wrong data from unfamiliar fields.

When writing parsers, access fields by name, never by position. Assert that required fields are present before reading them, and treat missing required fields as an error rather than returning a zero value that looks like valid data.
