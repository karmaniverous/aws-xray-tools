import type { XrayMode } from './XrayMode';

/**
 * Decide whether AWS X-Ray capture should be enabled based on capture mode and
 * daemon configuration.
 *
 * Semantics:
 * - `mode: 'off'` =\> disabled
 * - `mode: 'on'` =\> enabled
 * - `mode: 'auto'` =\> enabled only when `daemonAddress` is truthy
 *
 * @param mode - Capture mode.
 * @param daemonAddress - Daemon address (typically `process.env.AWS_XRAY_DAEMON_ADDRESS`).
 * @returns True when capture should be enabled.
 */
export const shouldEnableXray = (
  mode: XrayMode | undefined,
  daemonAddress: string | undefined,
): boolean => {
  if (mode === 'off') return false;
  if (mode === 'on') return true;
  return Boolean(daemonAddress);
};
