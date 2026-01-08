# Development Plan (stan.todo.md)

## Next up

- Verify downstream consumption from an `aws-*-tools` repo (no `aws-xray-sdk` installed by default).
- Decide first release version and publish (likely `0.0.1`).
- Consider adding CI workflow to run lint/test/typecheck/build/docs/knip on push.

## Completed (recent)

- Refactored requirements/docs for aws-xray-tools and added unit tests for X-Ray capture helpers.
- Fixed Vitest ESM mocks for aws-xray-sdk and added TSDoc for exported API.
- Verified typecheck/lint/test/docs/build/knip are clean.
