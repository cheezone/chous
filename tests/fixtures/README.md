# Test Fixtures

This directory contains data-driven test fixtures organized by expected outcome. The test runner automatically discovers and runs all fixtures.

## Directory Structure

- **pass/**: Contains test cases that are expected to **pass** all checks (valid configurations).
- **fail/**: Contains test cases that are expected to **fail** checks (used to verify error detection functionality).

## Adding New Test Cases

To add a new test case, simply create a new directory in the appropriate folder (`pass/` or `fail/`) with:
- A `.chous` configuration file
- Test files that demonstrate the scenario

The test runner will automatically discover and run the new test case. No code changes needed!

## Current Test Cases

### Pass Cases
- `allow-nested`: Basic allow rule in nested directory
- `allow-multiple`: Multiple extensions with allow
- `allow-array`: Array syntax for allow
- `allow-glob`: Glob patterns in allow
- `allow-relative`: Relative path patterns in allow
- `deep-nested`: Deep nested directory behavior

### Fail Cases
- `strict-nested`: Violate strict mode in nested directory
- `strict-files`: Violate strict files mode
- `move-nested`: Violate move rule in nested directory
- `use-nested`: Violate naming convention in nested directory

## Differences from Samples

- **samples/**: Contains real project examples that are expected to **pass** all checks (reference projects).
- **fixtures/pass/**: Contains focused test cases that are expected to **pass** (unit test scenarios).
- **fixtures/fail/**: Contains focused test cases that are expected to **fail** (error detection scenarios).
