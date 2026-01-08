# Requirements (stan.requirements.md)

When updated: 2025-12-31T00:00:00Z

## AWS secrets manager tools (get-dotenv based)

- Provide a public TypeScript wrapper named `AwsSecretsManagerTools`.
  - It owns the complex client setup (including optional AWS X-Ray capture) and exposes the fully configured SDK client for advanced usage.
  - Downstream consumers should primarily import this package (not construct `SecretsManagerClient` themselves) and may import AWS SDK command classes as needed for advanced operations.

- Construction
  - Provide an async factory:
    - `AwsSecretsManagerTools.init({ clientConfig?, xray? }) -> Promise<AwsSecretsManagerTools>`
  - The class constructor is not public (private/protected).
  - Do not support injecting a pre-built SDK client.

- Exposed instance state (DX / debugging)
  - `tools.client`: the effective AWS SDK v3 `SecretsManagerClient` instance.
    - When X-Ray is enabled, this must be the captured/instrumented client.
  - `tools.clientConfig`: the effective `SecretsManagerClientConfig` used to construct the base client.
  - `tools.xray`: materialized X-Ray state (mode + enabled flag + daemon address when relevant).
  - `tools.logger`: the logger used by the wrapper and used (as appropriate) for client construction/capture logging.

- Logging contract
  - The wrapper uses a console-like logger and requires the minimal set of methods it calls:
    - `debug`, `info`, `warn`, `error`
  - If `clientConfig.logger` is provided, validate it satisfies the contract; otherwise throw with a clear message instructing downstream consumers to proxy/wrap their logger.
  - If no logger is provided, default to `console`.

- Wrapper operations (env-map secrets)
  - Secret values are always a JSON object map of env vars (`ProcessEnv`).
  - Provide convenience methods with “tools-y” names:
    - `readEnvSecret({ secretId, versionId? })`
    - `updateEnvSecret({ secretId, value, versionId? })` (update-only; does not create)
    - `createEnvSecret({ secretId, value, description?, forceOverwriteReplicaSecret?, versionId? })`
    - `upsertEnvSecret({ secretId, value })` (create if missing, else update)
    - `deleteSecret({ secretId, recoveryWindowInDays?, forceDeleteWithoutRecovery? })`

- AWS X-Ray capture (guarded)
  - Default behavior is “auto”: only attempt X-Ray capture when `AWS_XRAY_DAEMON_ADDRESS` is set.
  - Do not import or enable X-Ray capture when the daemon address is not set (the X-Ray SDK will throw).
  - In “auto” mode, if `AWS_XRAY_DAEMON_ADDRESS` is set but `aws-xray-sdk` is not installed, throw with a clear error message.

- Provide a get-dotenv plugin mounted as `aws secrets` with commands:
  - `aws secrets pull`
  - `aws secrets push`
  - `aws secrets delete`

- `aws secrets` behavior:
  - Secret values are always a JSON object map of env vars (`ProcessEnv`).
  - Secret name expansion (e.g. `$STACK_NAME`) expands against `{ ...process.env, ...ctx.dotenv }` (ctx wins).
  - Dotenv file editing uses get-dotenv precedence semantics (“winner path”), not “write all paths”.
    - Prefer `editDotenvFile(...)` target selection behavior (last path wins unless configured otherwise).
  - `delete` defaults to recoverable deletion.
    - Do not specify `RecoveryWindowInDays` unless provided explicitly by the user.
    - Require `--force` to delete without recovery (`ForceDeleteWithoutRecovery: true`).
  - `push` uses get-dotenv provenance to select a subset of loaded keys for the secret payload.
    - Source of truth for values is `ctx.dotenv` (the host-resolved environment).
    - Selection is based on `ctx.dotenvProvenance` using the effective provenance entry only (the last entry for a key), not “any layer”.
    - Provide a repeatable `--from <selector...>` option that filters keys by effective provenance entry.
      - Default selection when `--from` is omitted: `file:env:private`.
      - Selector grammar supports all enumerated provenance kinds:
        - `file:<scope>:<privacy>` where `<scope>` is `global|env|*` and `<privacy>` is `public|private|*`
        - `config:<configScope>:<scope>:<privacy>` where `<configScope>` is `packaged|project|*`
        - `dynamic:<dynamicSource>` where `<dynamicSource>` is `config|programmatic|dynamicPath|*`
        - `vars`
      - Do not support file path-based matching in selectors.
    - After provenance selection, apply `--include/--exclude` as a final narrowing step.
      - `--include` and `--exclude` are mutually exclusive.
      - Unknown keys are ignored (no error).
    - Enforce AWS Secrets Manager SecretString size limits:
      - After filtering and JSON serialization, fail if the UTF-8 byte length exceeds 65,536 bytes.
  - `pull` supports destination selection and optional key filtering:
    - Replace `--scope`/`--privacy` flags with a single `--to <scope>:<privacy>` selector for the destination dotenv file.
      - Default: `env:private` (writes to `.env.<env>.<privateToken>`).
      - Require `--env` (or defaultEnv resolution) only when `--to env:*` is selected.
    - Support `--include/--exclude` to filter which pulled keys are written (partial update; does not delete unspecified keys).
  - `push` include/exclude filters ignore unknown keys (no error).
  - Region is sourced from the aws plugin context (not hard-coded).

- get-dotenv config support for `aws secrets` (safe defaults only)
  - Support plugin configuration under `plugins['aws/secrets']` for safe default values, without enabling dangerous behavior by default.
  - Allowed safe defaults include:
    - `secretName` default
    - `templateExtension` default
    - `from` selectors default for push
    - `to` selector default for pull
    - `include`/`exclude` defaults (with mutual exclusion enforced at runtime)
  - Disallowed defaults include:
    - `delete.force` (must only be enabled explicitly by CLI flag)

## CLI

- Replace the repo sample CLI with a get-dotenv-based CLI with alias:
  - `aws-xray-tools`
- The CLI duplicates the default get-dotenv CLI behavior, but includes the `secrets` plugin under `aws`.
- Do not mount `awsWhoamiPlugin` in this repo’s CLI composition.

## Bundling (Rollup)

- Package is ESM-only.
- Library outputs:
  - ESM output (single ESM build; no CJS build).
  - Types bundled at dist/index.d.ts.
- CLI outputs:
  - CLI commands built from src/cli/<command>/index.ts into dist/cli/<command>/index.js with a shebang banner (#!/usr/bin/env node).
- Externalization:
  - Treat Node built-ins and all runtime dependencies/peerDependencies as external.
- Plugins:
  - Keep the library build minimal (TypeScript for transpile; rollup-plugin-dts for types).
  - CLI builds may use commonjs/json/node-resolve where helpful.
- Rollup config contract:
  - rollup.config.ts MUST export:
    - `buildLibrary(dest): RollupOptions`
    - `buildTypes(dest): RollupOptions`
  - stan.rollup.config.ts consumes these for the STAN dev build.

## ESLint

- Use a TypeScript flat config at eslint.config.ts.
- Lint uses @typescript-eslint strictTypeChecked config, Prettier alignment, simple-import-sort, and tsdoc syntax checks.
- Exclude STAN dev build artifacts from lint (ignore `.stan/**`).

## TypeScript configs

- No separate tsconfig.rollup.json is required at this time; the Rollup TypeScript plugin overrides conflicting compiler options for bundling (noEmit=false, declaration=false, etc.).
