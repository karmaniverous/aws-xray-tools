/**
 * Requirements addressed:
 * - `captureAwsSdkV3Client` must load `aws-xray-sdk` synchronously using
 *   `createRequire` (not dynamic async import).
 * - Keep the load behind a small module seam so unit tests can mock it without
 *   relying on Node/Vitest interception of CJS `require`.
 */

import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);

export const requireAwsXraySdk = (): unknown => require('aws-xray-sdk');
