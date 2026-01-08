import type { XrayMode } from './XrayMode';

export const shouldEnableXray = (
  mode: XrayMode | undefined,
  daemonAddress: string | undefined,
): boolean => {
  if (mode === 'off') return false;
  if (mode === 'on') return true;
  return Boolean(daemonAddress);
};
