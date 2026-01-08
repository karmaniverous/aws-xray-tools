# AWS X-Ray Tools

[![npm version](https://img.shields.io/npm/v/@karmaniverous/aws-xray-tools.svg)](https://www.npmjs.com/package/@karmaniverous/aws-xray-tools) ![Node Current](https://img.shields.io/node/v/@karmaniverous/aws-xray-tools) [![docs](https://img.shields.io/badge/docs-website-blue)](https://docs.karmanivero.us/aws-xray-tools) [![changelog](https://img.shields.io/badge/changelog-latest-blue.svg)](./CHANGELOG.md) [![license](https://img.shields.io/badge/license-BSD--3--Clause-blue.svg)](./LICENSE)

Small, focused utilities for **guarded AWS X-Ray capture** of **AWS SDK v3** clients.

This package is intended to be imported by other `aws-*-tools` packages so they can offer consistent, optional X-Ray instrumentation without duplicating guarded-import logic.

## Install

```bash
npm i @karmaniverous/aws-xray-tools
```

This package is ESM-only (Node >= 20).

## Public API

```ts
import {
  captureAwsSdkV3Client,
  shouldEnableXray,
  type Logger,
  type XrayMode,
  type XrayState,
} from '@karmaniverous/aws-xray-tools';
```

## Quick start (capture an AWS SDK v3 client)

```ts
import { SecretsManagerClient } from '@aws-sdk/client-secrets-manager';
import { captureAwsSdkV3Client } from '@karmaniverous/aws-xray-tools';

const base = new SecretsManagerClient({ region: 'us-east-1' });

// Guarded: does nothing unless capture is enabled and daemon is configured.
const client = captureAwsSdkV3Client(base, {
  mode: 'auto',
  daemonAddress: process.env.AWS_XRAY_DAEMON_ADDRESS,
  logger: console,
});
```

## Capture mode semantics

- `mode: 'off'`: never capture.
- `mode: 'auto'` (default): capture only when `AWS_XRAY_DAEMON_ADDRESS` is set.
- `mode: 'on'`: force capture (throws if daemon address is missing).

## aws-xray-sdk (optional peer dependency)

This package loads `aws-xray-sdk` only when capture is enabled.

To enable capture in your app/package, install the optional peer dependency:

```bash
npm i aws-xray-sdk
```

If capture is enabled but `aws-xray-sdk` is not installed, `captureAwsSdkV3Client` throws with a clear error message.

## Documentation

- STAN assistant guide: [`guides/stan-assistant-guide.md`](./guides/stan-assistant-guide.md)
- Generated API reference: https://docs.karmanivero.us/aws-xray-tools

---

Built for you with ❤️ on Bali! Find more great tools & templates on [my GitHub Profile](https://github.com/karmaniverous).
