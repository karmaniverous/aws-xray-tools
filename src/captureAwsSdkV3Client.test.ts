/**
 * Requirements addressed:
 * - `captureAwsSdkV3Client` is guarded:
 *   - when capture is disabled, it returns the original client and MUST NOT
 *     attempt to import `aws-xray-sdk`.
 * - When capture is enabled:
 *   - throws if daemon address is missing
 *   - dynamically imports `aws-xray-sdk`
 *   - throws if `captureAWSv3Client` export is missing
 *   - otherwise returns the captured client
 */

import { describe, expect, it, vi } from 'vitest';

describe('captureAwsSdkV3Client', () => {
  it('returns original client and does not import when mode is off', async () => {
    vi.resetModules();
    vi.doMock('aws-xray-sdk', () => {
      throw new Error('aws-xray-sdk import should not occur');
    });

    const { captureAwsSdkV3Client } = await import('./captureAwsSdkV3Client');

    const client = { tag: 'base' };
    await expect(
      captureAwsSdkV3Client(client, { mode: 'off', daemonAddress: 'x' }),
    ).resolves.toBe(client);
  });

  it('returns original client and does not import when mode is auto and daemon is unset', async () => {
    vi.resetModules();
    vi.doMock('aws-xray-sdk', () => {
      throw new Error('aws-xray-sdk import should not occur');
    });

    const { captureAwsSdkV3Client } = await import('./captureAwsSdkV3Client');

    const client = { tag: 'base' };
    await expect(
      captureAwsSdkV3Client(client, { mode: 'auto', daemonAddress: undefined }),
    ).resolves.toBe(client);
  });

  it('throws when mode is on but daemon address is missing', async () => {
    vi.resetModules();
    vi.doMock('aws-xray-sdk', () => {
      throw new Error('aws-xray-sdk import should not occur');
    });

    const { captureAwsSdkV3Client } = await import('./captureAwsSdkV3Client');

    await expect(
      captureAwsSdkV3Client({}, { mode: 'on', daemonAddress: undefined }),
    ).rejects.toThrow('AWS_XRAY_DAEMON_ADDRESS is not set');
  });

  it('throws when aws-xray-sdk lacks captureAWSv3Client', async () => {
    vi.resetModules();
    vi.doMock('aws-xray-sdk', () => ({}));

    const { captureAwsSdkV3Client } = await import('./captureAwsSdkV3Client');

    await expect(
      captureAwsSdkV3Client(
        {},
        { mode: 'on', daemonAddress: '127.0.0.1:2000', logger: console },
      ),
    ).rejects.toThrow('aws-xray-sdk missing captureAWSv3Client export');
  });

  it('captures client when aws-xray-sdk exposes captureAWSv3Client', async () => {
    vi.resetModules();
    const captureAWSv3Client = vi.fn(<T extends object>(c: T) => c);
    vi.doMock('aws-xray-sdk', () => ({ captureAWSv3Client }));

    const { captureAwsSdkV3Client } = await import('./captureAwsSdkV3Client');

    const client = { tag: 'base' };
    const res = await captureAwsSdkV3Client(client, {
      mode: 'on',
      daemonAddress: '127.0.0.1:2000',
      logger: console,
    });

    expect(captureAWSv3Client).toHaveBeenCalledTimes(1);
    expect(captureAWSv3Client).toHaveBeenCalledWith(client);
    expect(res).toBe(client);
  });
});
