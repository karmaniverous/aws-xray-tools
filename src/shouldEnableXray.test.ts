/**
 * Requirements addressed:
 * - `shouldEnableXray` implements mode semantics:
 *   - 'off' =\> false
 *   - 'on' =\> true
 *   - 'auto' =\> Boolean(daemonAddress)
 */

import { describe, expect, it } from 'vitest';

import { shouldEnableXray } from './shouldEnableXray';

describe('shouldEnableXray', () => {
  it('disables capture in off mode', () => {
    expect(shouldEnableXray('off', undefined)).toBe(false);
    expect(shouldEnableXray('off', '127.0.0.1:2000')).toBe(false);
  });

  it('enables capture in on mode', () => {
    expect(shouldEnableXray('on', undefined)).toBe(true);
    expect(shouldEnableXray('on', '127.0.0.1:2000')).toBe(true);
  });

  it('enables capture in auto mode only when daemonAddress is set', () => {
    expect(shouldEnableXray('auto', undefined)).toBe(false);
    expect(shouldEnableXray('auto', '')).toBe(false);
    expect(shouldEnableXray('auto', '127.0.0.1:2000')).toBe(true);
  });
});
