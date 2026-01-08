/**
 * Capture mode for AWS X-Ray integration.
 *
 * - `'auto'`: enable capture only when `AWS_XRAY_DAEMON_ADDRESS` is set.
 * - `'on'`: force enable capture (requires daemon address).
 * - `'off'`: never enable capture.
 */
export type XrayMode = 'auto' | 'on' | 'off';
