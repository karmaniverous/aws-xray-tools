import type { Logger } from './Logger';
import { shouldEnableXray } from './shouldEnableXray';
import type { XrayMode } from './XrayMode';

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
