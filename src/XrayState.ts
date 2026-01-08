import type { XrayMode } from './XrayMode';

/**
 * Materialized X-Ray state for diagnostics and DX.
 *
 * Note: `enabled` reflects the effective runtime decision after applying the
 * configured `mode` and checking daemon configuration.
 */
export type XrayState = {
  /** Capture mode configured for initialization. */
  mode: XrayMode;
  /** Whether capture is enabled for the effective client instance. */
  enabled: boolean;
  /** Daemon address used when capture is enabled (if available). */
  daemonAddress?: string;
};
