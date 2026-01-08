---
title: STAN assistant guide (aws-xray-tools)
---

# STAN assistant guide: @karmaniverous/aws-xray-tools

This guide is a compact, implementation-synced reference for STAN assistants integrating this package (library + get-dotenv plugin + shipped CLI).

## What this package provides

- Programmatic wrapper:
  - `AwsSecretsManagerTools` (async factory via `AwsSecretsManagerTools.init(...)`)
- get-dotenv plugin (mounted under `aws`):
  - `secretsPlugin()` → `aws secrets pull|push|delete`
- Shipped CLI (get-dotenv host embedding the plugin):
  - `aws-xray-tools`

## Public API (imports)

```ts
import {
  AwsSecretsManagerTools,
  secretsPlugin,
  type ProcessEnv,
} from '@karmaniverous/aws-xray-tools';
```

## Core data model: “env-map” secrets

This package treats the AWS Secrets Manager secret value as a JSON object map stored in `SecretString`:

```json
{ "KEY": "value", "OPTIONAL": null }
```

Rules:

- Values must be `string` or `null`.
- When decoding, `null` is treated as `undefined` (because JSON can’t represent `undefined`).
- Binary secrets (`SecretBinary`) are not supported by the wrapper.

The canonical type is:

```ts
export type ProcessEnv = ProcessEnv;
```

## Programmatic API: AwsSecretsManagerTools

Use this when you want to read/write env-map secrets in application code.

The tools wrapper assumes Secrets Manager secrets are stored as a JSON object map of env vars.

Initialize tools (recommended):

```ts
import { AwsSecretsManagerTools } from '@karmaniverous/aws-xray-tools';

const tools = await AwsSecretsManagerTools.init({
  clientConfig: { region: 'us-east-1', logger: console },
  xray: 'auto',
});
```

### Init behavior (important constraints)

- `clientConfig` is an AWS SDK v3 `SecretsManagerClientConfig`.
  - If `clientConfig.logger` is provided, it must implement the unified get-dotenv `Logger` contract: `debug`, `info`, `warn`, and `error` (validated up front; no polyfills).
- X-Ray capture is optional and guarded:
  - Default is `xray: 'auto'`: enabled only when `AWS_XRAY_DAEMON_ADDRESS` is set.
  - If capture is enabled but `aws-xray-sdk` is not installed, initialization throws with a clear error message.

### Escape hatch: use the raw AWS SDK client

Import AWS SDK command classes as needed for advanced operations:

```ts
import { ListSecretsCommand } from '@aws-sdk/client-secrets-manager';

const res = await tools.client.send(new ListSecretsCommand({}));
```

Convenience methods (env-map secrets):

- `readEnvSecret({ secretId, versionId? }) -> ProcessEnv`
- `updateEnvSecret({ secretId, value, versionId? }) -> Promise<void>` (update-only; does not create)
- `createEnvSecret({ secretId, value, description?, forceOverwriteReplicaSecret?, versionId? }) -> Promise<void>`
- `upsertEnvSecret({ secretId, value }) -> Promise<'updated' | 'created'>` (creates only on `ResourceNotFoundException`)
- `deleteSecret({ secretId, recoveryWindowInDays?, forceDeleteWithoutRecovery? }) -> Promise<void>`

For complete usage examples, see the [AwsSecretsManagerTools guide](./aws-xray-tools.md).

## CLI and get-dotenv plugin: aws secrets

### Shipped CLI

The shipped CLI is a get-dotenv CLI host with the secrets plugin mounted under `aws`:

```bash
aws-xray-tools --env dev aws secrets pull --secret-name '$STACK_NAME'
aws-xray-tools --env dev aws secrets push --secret-name '$STACK_NAME'
aws-xray-tools --env dev aws secrets delete --secret-name '$STACK_NAME'
```

Key behaviors:

- `--env` is a root-level get-dotenv option and must appear before the command path.
- `--secret-name` supports `$VAR` expansion evaluated at action time against `{ ...process.env, ...ctx.dotenv }` (`ctx.dotenv` wins).

### Embedding the plugin in another host

Mount it under `aws` (the parent aws plugin is responsible for AWS auth/session and publishes region metadata):

```ts
import { createCli } from '@karmaniverous/get-dotenv/cli';
import { awsPlugin } from '@karmaniverous/get-dotenv/plugins';

import { secretsPlugin } from '@karmaniverous/aws-xray-tools';

await createCli({
  alias: 'toolbox',
  compose: (program) => program.use(awsPlugin().use(secretsPlugin())),
})();
```

### Region sourcing

The secrets plugin reads region from the aws plugin’s published ctx state (when present):

- `ctx.plugins.aws.region`

### Plugin config (getdotenv.config.\*)

Safe defaults can be provided under the realized mount path key:

- `plugins['aws/secrets']`

Supported config keys (schema-validated; unknown keys stripped):

- `secretName?: string` (supports `$VAR` expansion at action time for CLI flags; config interpolation is handled by get-dotenv before runtime)
- `templateExtension?: string`
- `push?: { from?: string[]; include?: string[]; exclude?: string[] }`
- `pull?: { to?: string; include?: string[]; exclude?: string[] }`

Safety constraint (intentional):

- There is no config default for “force delete”; `--force` must be explicit at runtime.

Example:

```jsonc
{
  "plugins": {
    "aws/secrets": {
      "secretName": "$STACK_NAME",
      "templateExtension": "template",
      "push": { "from": ["file:env:private"] },
      "pull": { "to": "env:private" },
    },
  },
}
```

## Command semantics (implementation-synced)

### Shared: secret name expansion

- `--secret-name` is expanded using `{ ...process.env, ...ctx.dotenv }` (`ctx.dotenv` wins).
- If the expanded result is empty, the command errors.

### `aws secrets pull`

- Reads the secret (env-map JSON) and applies it as a partial update to a single dotenv file selected by `--to`.
- `--to <scope:privacy>` (default: `env:private`):
  - `env:private` → `.env.<env>.<privateToken>`
  - `env:public` → `.env.<env>`
  - `global:private` → `.env.<privateToken>`
  - `global:public` → `.env`
- If `--to env:*` is selected, `--env` (or `defaultEnv`) must be resolvable.
- Template bootstrap: if the target is missing but `<target>.<templateExtension>` exists, the template is copied first and then edited in place (format-preserving).
- Optional key filtering:
  - `--include` / `--exclude` are mutually exclusive.

### `aws secrets push`

Push selects payload keys using get-dotenv provenance:

- Source of truth is `ctx.dotenv`.
- Selection is based on `ctx.dotenvProvenance` and matches only the effective provenance entry (the last entry per key).
- Keys are considered only when:
  - the key exists in provenance (keys lacking provenance are excluded), and
  - the current value is not `undefined`, and
  - the effective provenance entry is not `op: 'unset'`.

Selector option:

- `--from <selector>` is repeatable.
- Default selection when `--from` is omitted: `file:env:private`.

Selector grammar:

- `file:<scope>:<privacy>` where `<scope>` is `global|env|*` and `<privacy>` is `public|private|*`
- `config:<configScope>:<scope>:<privacy>` where `<configScope>` is `packaged|project|*`
- `dynamic:<dynamicSource>` where `<dynamicSource>` is `config|programmatic|dynamicPath|*`
- `vars`

After provenance selection:

- Apply `--include` / `--exclude` as a final narrowing step (mutually exclusive; unknown keys ignored).
- Enforce Secrets Manager `SecretString` size limit: after JSON serialization, UTF-8 byte length must be ≤ 65,536 bytes (otherwise the command errors and suggests narrowing selection).

### `aws secrets delete`

- Recoverable deletion is the default behavior (AWS default recovery window).
- `--force` performs delete-without-recovery (dangerous).
- `--recovery-window-days <number>` sets an explicit recovery window.
- `--force` conflicts with `--recovery-window-days`.

## Related docs

- Package overview and quick starts: see the [README](../README.md).
- Full programmatic reference: see the [AwsSecretsManagerTools guide](./aws-xray-tools.md).
- Full CLI/plugin reference: see the [aws secrets plugin guide](./secrets-plugin.md).
- End-to-end AWS smoke tests: see the [smoke test guide](../smoke/README.md).
