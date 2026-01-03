# Test Fixtures

This directory contains examples of projects that are expected to have linting errors. These projects are specifically designed to verify that `chous` can correctly detect and report various file structure issues.

## Test Projects

### test-template-project
- **Purpose**: Test various file structure rules and error detection.
- **Project Type**: A test template project containing multiple intentional issues.
- **Expectation**: It should trigger multiple lint errors to verify the error reporting functionality.

## Usage

These fixture projects are used to ensure that `chous` accurately detects and reports file structure violations. When running tests, ensure these projects are correctly flagged. If a fixture project does not trigger the expected errors, it may indicate that the linting rules or the engine need adjustment.

## Differences from Samples

- **samples/**: Contains real project examples that are expected to **pass** all checks (reference projects).
- **fixtures/**: Contains test cases that are expected to **fail** checks (used to verify error detection functionality).
