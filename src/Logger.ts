/**
 * Logger interface compatible with AWS SDK v3 expectations (`debug`, `info`, `warn`, `error`).
 * Consumers must provide an object that implements these four methods.
 * Additional methods (like `log`) are allowed but not required or used by this library.
 */
export type Logger = Pick<Console, 'debug' | 'info' | 'warn' | 'error'>;
