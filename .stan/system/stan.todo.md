# Development Plan (stan.todo.md)

## Next up

- Re-run `npm run test`, `npm run docs -- --emit none`, and `npm run build` after making `captureAwsSdkV3Client` synchronous.
- Verify downstream consumption from an `aws-*-tools` repo (no `aws-xray-sdk` installed by default).
- Decide first release version and publish.

## Completed (recent)

- Refactored requirements/docs for aws-xray-tools and added unit tests for X-Ray capture helpers.
- Fixed Vitest ESM mocks for aws-xray-sdk and added TSDoc for exported API.
- Verified typecheck/lint/test/docs/build/knip are clean.
- Refactored captureAwsSdkV3Client to sync createRequire and updated docs/tests.
