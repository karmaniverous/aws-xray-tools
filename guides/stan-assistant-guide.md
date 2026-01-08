---
title: STAN assistant guide (aws-xray-tools)
---

# STAN assistant guide: @karmaniverous/aws-xray-tools

This guide is a compact, implementation-synced reference for STAN assistants integrating this package.

## What this package provides

This package provides a small set of **guarded AWS X-Ray capture utilities** intended to be shared by `aws-*-tools` packages:

- `captureAwsSdkV3Client(...)`: guarded dynamic import + capture for AWS SDK v3 clients
- `shouldEnableXray(...)`: pure decision helper for `auto|on|off`
- Public types for consistent interop:
  - `Logger`, `XrayMode`, `XrayState`

This package does **not** provide an AWS service wrapper, a get-dotenv plugin, or a CLI.

## Public API (imports)

```ts
import {
  captureAwsSdkV3Client,
  shouldEnableXray,
  type Logger,
  type XrayMode,
  type XrayState,
} from '@karmaniverous/aws-xray-tools';
```

## Mental model: guarded capture

AWS X-Ray capture is optional and must be guarded:

- Default behavior should be `mode: 'auto'`: capture only when `AWS_XRAY_DAEMON_ADDRESS` is set.
- Avoid importing `aws-xray-sdk` unless capture is enabled (some X-Ray integrations throw when daemon config is missing).
- Fail fast with clear errors when capture is requested but prerequisites are missing.

## `XrayMode`

```ts
export type XrayMode = 'auto' | 'on' | 'off';
```

Semantics:

- `'off'`: never capture.
- `'auto'`: capture only when a daemon address is present.
- `'on'`: force capture (requires daemon address).

## `shouldEnableXray(mode, daemonAddress)`

Pure helper for “mode + daemon config → enabled?”:

- `'off'` → `false`
- `'on'` → `true`
- `'auto'` → `Boolean(daemonAddress)`

Usage pattern:

```ts
const daemonAddress = process.env.AWS_XRAY_DAEMON_ADDRESS;
const enabled = shouldEnableXray('auto', daemonAddress);
```

## `captureAwsSdkV3Client(client, opts?)`

Capture an AWS SDK v3 client when enabled:

- If capture is not enabled, returns `client` unchanged (no import attempt).
- If capture is enabled but daemon address is missing, throws:
  - `"X-Ray capture requested but AWS_XRAY_DAEMON_ADDRESS is not set."`
- If capture is enabled but `aws-xray-sdk` cannot be imported, throws:
  - `"X-Ray capture is enabled but 'aws-xray-sdk' is not installed. Install it or set xray to 'off'."`
- If `aws-xray-sdk` is present but does not expose `captureAWSv3Client`, throws:
  - `"aws-xray-sdk missing captureAWSv3Client export."`

Minimal usage:

```ts
import { SecretsManagerClient } from '@aws-sdk/client-secrets-manager';
import { captureAwsSdkV3Client } from '@karmaniverous/aws-xray-tools';

const base = new SecretsManagerClient({ region: 'us-east-1', logger: console });

const captured = await captureAwsSdkV3Client(base, {
  mode: 'auto',
  daemonAddress: process.env.AWS_XRAY_DAEMON_ADDRESS,
  logger: console,
});
```

## `Logger` contract

This package expects a console-like logger compatible with AWS SDK v3 client config expectations:

- `debug`, `info`, `warn`, `error`

```ts
export type Logger = Pick<Console, 'debug' | 'info' | 'warn' | 'error'>;
```

Notes:

- Additional methods (like `log`) are allowed but not required.
- This package does not validate logger shape; downstream wrappers may validate if needed.

## `XrayState` (recommended wrapper DX)

`XrayState` is a small diagnostic payload you can store on your wrappers for “what happened?” visibility:

```ts
export type XrayState = {
  mode: XrayMode;
  enabled: boolean;
  daemonAddress?: string;
};
```

Typical wrapper pattern:

```ts
const daemonAddress = process.env.AWS_XRAY_DAEMON_ADDRESS;
const enabled = shouldEnableXray(mode, daemonAddress);

const client = enabled
  ? await captureAwsSdkV3Client(base, { mode, daemonAddress, logger })
  : base;

const xray: XrayState = {
  mode,
  enabled,
  ...(enabled && daemonAddress ? { daemonAddress } : {}),
};
```

## Optional peer dependency: `aws-xray-sdk`

This package dynamically imports `aws-xray-sdk` when capture is enabled.

Implications:

- `aws-xray-sdk` should be treated as an optional peer dependency by consumers.
- If your app/package enables capture at runtime, you must install `aws-xray-sdk`.
- If your app/package never enables capture (e.g. always `mode: 'off'`), you do not need `aws-xray-sdk`.

## Related docs

- Package overview and quick start: see the [README](../README.md).
