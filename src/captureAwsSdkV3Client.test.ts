/**
 * Requirements addressed:
 * - `captureAwsSdkV3Client` is guarded:
 *   - when capture is disabled, it returns the original client and MUST NOT
 *     attempt to load `aws-xray-sdk`.
 * - When capture is enabled:
 *   - throws if daemon address is missing
 *   - synchronously loads `aws-xray-sdk`
 *   - throws if `captureAWSv3Client` export is missing
 *   - otherwise returns the captured client
 */

import { describe, expect, it, vi } from 'vitest';

const makeLogger = () => ({
  debug: vi.fn(),
  info: vi.fn(),
  warn: vi.fn(),
  error: vi.fn(),
});

describe('captureAwsSdkV3Client', () => {
  it('returns original client and does not load when mode is off', async () => {
    vi.resetModules();
    const requireAwsXraySdk = vi.fn(() => {
      throw new Error('aws-xray-sdk require should not occur');
    });
    vi.doMock('./requireAwsXraySdk', () => ({ requireAwsXraySdk }));

    const { captureAwsSdkV3Client } = await import('./captureAwsSdkV3Client');

    const client = { tag: 'base' };
    const out = captureAwsSdkV3Client(client, {
      mode: 'off',
      daemonAddress: '127.0.0.1:2000',
      logger: makeLogger(),
    });
    expect(out).toBe(client);
    expect(requireAwsXraySdk).not.toHaveBeenCalled();
  });

  it('returns original client and does not load when mode is auto and daemon is unset', async () => {
    vi.resetModules();
    const requireAwsXraySdk = vi.fn(() => {
      throw new Error('aws-xray-sdk require should not occur');
    });
    vi.doMock('./requireAwsXraySdk', () => ({ requireAwsXraySdk }));

    const { captureAwsSdkV3Client } = await import('./captureAwsSdkV3Client');

    const client = { tag: 'base' };
    const out = captureAwsSdkV3Client(client, {
      mode: 'auto',
      daemonAddress: undefined,
      logger: makeLogger(),
    });
    expect(out).toBe(client);
    expect(requireAwsXraySdk).not.toHaveBeenCalled();
  });

  it('throws when mode is on but daemon address is missing', async () => {
    vi.resetModules();
    const requireAwsXraySdk = vi.fn(() => {
      throw new Error('aws-xray-sdk require should not occur');
    });
    vi.doMock('./requireAwsXraySdk', () => ({ requireAwsXraySdk }));

    const { captureAwsSdkV3Client } = await import('./captureAwsSdkV3Client');

    expect(() =>
      captureAwsSdkV3Client(
        {},
        { mode: 'on', daemonAddress: undefined, logger: makeLogger() },
      ),
    ).toThrow('AWS_XRAY_DAEMON_ADDRESS is not set');
    expect(requireAwsXraySdk).not.toHaveBeenCalled();
  });

  it('throws when aws-xray-sdk lacks captureAWSv3Client', async () => {
    vi.resetModules();
    const requireAwsXraySdk = vi.fn(() => ({}));
    vi.doMock('./requireAwsXraySdk', () => ({ requireAwsXraySdk }));

    const { captureAwsSdkV3Client } = await import('./captureAwsSdkV3Client');

    expect(() =>
      captureAwsSdkV3Client(
        {},
        {
          mode: 'on',
          daemonAddress: '127.0.0.1:2000',
          logger: makeLogger(),
        },
      ),
    ).toThrow('aws-xray-sdk missing captureAWSv3Client export');
    expect(requireAwsXraySdk).toHaveBeenCalledTimes(1);
  });

  it('captures client when aws-xray-sdk exposes captureAWSv3Client', async () => {
    vi.resetModules();
    const captureAWSv3Client = vi.fn(<T extends object>(c: T) => c);
    const requireAwsXraySdk = vi.fn(() => ({ captureAWSv3Client }));
    vi.doMock('./requireAwsXraySdk', () => ({ requireAwsXraySdk }));

    const { captureAwsSdkV3Client } = await import('./captureAwsSdkV3Client');

    const client = { tag: 'base' };
    const res = captureAwsSdkV3Client(client, {
      mode: 'on',
      daemonAddress: '127.0.0.1:2000',
      logger: makeLogger(),
    });

    expect(captureAWSv3Client).toHaveBeenCalledTimes(1);
    expect(captureAWSv3Client).toHaveBeenCalledWith(client);
    expect(res).toBe(client);
    expect(requireAwsXraySdk).toHaveBeenCalledTimes(1);
  });
});
