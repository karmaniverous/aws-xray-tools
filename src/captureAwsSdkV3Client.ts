import type { Logger } from './Logger';
import { shouldEnableXray } from './shouldEnableXray';
import type { XrayMode } from './XrayMode';

/**
 * Capture (instrument) an AWS SDK v3 client with AWS X-Ray when enabled.
 *
 * Guarded behavior:
 * - When capture is not enabled (based on {@link shouldEnableXray}), returns
 *   the original `client` unchanged and does not import `aws-xray-sdk`.
 * - When capture is enabled but `daemonAddress` is missing, throws.
 * - When capture is enabled, dynamically imports `aws-xray-sdk` and uses its
 *   `captureAWSv3Client` helper to instrument the client.
 *
 * @typeParam TClient - AWS SDK v3 client type (any object with methods).
 * @param client - The AWS SDK v3 client instance to capture.
 * @param opts - Capture options.
 * @returns The captured client (or the original client when capture is disabled).
 *
 * @throws If capture is enabled but `AWS_XRAY_DAEMON_ADDRESS` is not set.
 * @throws If capture is enabled but `aws-xray-sdk` is not installed.
 * @throws If `aws-xray-sdk` does not expose `captureAWSv3Client`.
 */
export const captureAwsSdkV3Client = async <TClient extends object>(
  client: TClient,
  {
    mode = 'auto',
    logger = console,
    daemonAddress = process.env.AWS_XRAY_DAEMON_ADDRESS,
  }: {
    mode?: XrayMode;
    logger?: Logger;
    daemonAddress?: string;
  } = {},
): Promise<TClient> => {
  if (!shouldEnableXray(mode, daemonAddress)) return client;

  if (!daemonAddress) {
    throw new Error(
      'X-Ray capture requested but AWS_XRAY_DAEMON_ADDRESS is not set.',
    );
  }

  // Guarded dynamic import: some X-Ray SDK integrations throw when daemon
  // configuration is missing, so do not import unless we are capturing.
  let mod: { default?: unknown };
  try {
    mod = (await import('aws-xray-sdk')) as unknown as { default?: unknown };
  } catch {
    throw new Error(
      "X-Ray capture is enabled but 'aws-xray-sdk' is not installed. Install it or set xray to 'off'.",
    );
  }
  const AWSXRay = (mod.default ?? mod) as unknown as {
    captureAWSv3Client?: <U extends object>(c: U) => U;
  };

  if (typeof AWSXRay.captureAWSv3Client !== 'function') {
    logger.debug('aws-xray-sdk does not expose captureAWSv3Client', AWSXRay);
    throw new Error('aws-xray-sdk missing captureAWSv3Client export.');
  }

  logger.debug('Enabling AWS X-Ray capture for AWS SDK v3 client.');
  return AWSXRay.captureAWSv3Client(client);
};
