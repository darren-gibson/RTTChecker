# Definition of Done - Quality Standards

## Overview

All changes to this codebase must meet the following quality standards before being considered complete. AI-based code assistants should validate these criteria before marking work as done.

## Clean Code Principles

This project prioritizes **clean, well-structured, maintainable code**:

- **Clear intent over clever code**: Readable code that clearly expresses its purpose
- **Small, focused functions**: Each function does one thing well
- **Meaningful names**: Variables, functions, and classes have descriptive names
- **Minimal nesting**: Prefer early returns and guard clauses
- **DRY principle**: Don't repeat yourself - extract common patterns
- **Separation of concerns**: Domain logic separate from infrastructure
- **Explicit over implicit**: Clear, obvious code over hidden magic

## Code Quality Checklist

### 1. ✅ Linting & Formatting

- [ ] **Linting passes**: `npm run lint` completes with no errors
- [ ] **Formatting applied**: `npm run format` has been executed
- [ ] **Formatting verified**: `npm run format:check` passes
- [ ] Import order follows project conventions (external imports, blank line, internal imports sorted alphabetically)
- [ ] No unused variables or imports (prefix with `_` if intentionally unused)
- [ ] TypeScript types are properly defined (avoid `any` unless absolutely necessary)

### 2. ✅ Testing (BDD-First Approach)

- [ ] **All tests pass**: `npm test` completes successfully
- [ ] **BDD tests for business logic**: New user-facing features MUST have Cucumber/Gherkin scenarios
- [ ] **Test pyramid balance**: Prefer BDD scenarios > integration tests > unit tests
- [ ] **Test coverage maintained**: No decrease in overall coverage percentage
- [ ] **Edge cases tested**: Zero values, null/undefined, boundary conditions
- [ ] **Error paths tested**: Failure scenarios and error handling validated

**Testing Strategy Priority:**

1. **BDD/Cucumber** (`.feature` files): For business logic, user stories, acceptance criteria
2. **Integration tests**: For external system interactions, API clients, database operations
3. **Unit tests**: For isolated utility functions, pure domain logic, edge cases

**BDD Best Practices:**

- [ ] Feature files use clear, non-technical language (Given/When/Then)
- [ ] Scenarios test business value, not implementation details
- [ ] Step definitions are reusable across scenarios
- [ ] Tests document expected behavior as living documentation

### 3. ✅ Code Structure & Patterns (Clean Code)

- [ ] **Follows existing patterns**: Consistent with codebase architecture
- [ ] **Separation of concerns**: Domain logic, API clients, runtime, utilities properly separated
- [ ] **Single Responsibility**: Each class/function has one clear purpose
- [ ] **Small functions**: Functions are < 20 lines when possible (exceptions for readability)
- [ ] **Descriptive naming**: Names reveal intent without needing comments
- [ ] **No code duplication**: Extract repeated logic into reusable functions
- [ ] **Minimal complexity**: Avoid deeply nested conditionals, prefer early returns
- [ ] **Error handling**: Uses custom error classes from `src/errors.ts` or domain-specific errors
- [ ] **Logging**: Appropriate use of logger with correct log levels (debug, info, warn, error)
- [ ] **TypeScript best practices**: Proper use of types, interfaces, and generics
- [ ] **Async/await**: Promises handled correctly, no dangling promises
- [ ] **Event emitters**: Proper cleanup of listeners to prevent memory leaks

### 4. ✅ Documentation

- [ ] **Code comments**: Complex logic explained with inline comments
- [ ] **JSDoc**: Public APIs documented with parameter and return types
- [ ] **README updates**: User-facing changes reflected in relevant README files
- [ ] **Architecture docs**: Significant changes documented in `/docs` directory
- [ ] **Breaking changes**: Clearly documented with migration guidance

### 5. ✅ Dependencies & Security

- [ ] **Dependencies justified**: New dependencies have clear rationale
- [ ] **Vulnerability check**: `npm audit --production` passes or vulnerabilities documented
- [ ] **Version pinning**: Critical dependencies use exact versions
- [ ] **License compliance**: New dependencies use compatible licenses (Apache 2.0, MIT, BSD)

### 6. ✅ Git & Version Control

- [ ] **Meaningful commit messages**: Clear, concise description of what and why
- [ ] **Commits are atomic**: Each commit represents a single logical change
- [ ] **No debugging artifacts**: Console.logs, commented code, TODO markers addressed
- [ ] **Branch is clean**: No merge conflicts or uncommitted changes

### 7. ✅ Matter.js Specific Standards

- [ ] **Event timing**: Race conditions considered, especially around Matter server initialization
- [ ] **Device lifecycle**: Proper startup, shutdown, and cleanup sequences
- [ ] **Cluster implementations**: Follow Matter specification patterns
- [ ] **Endpoint management**: Proper device type and cluster assignments
- [ ] **Commissioning support**: QR codes and pairing information correct

### 8. ✅ Performance & Reliability

- [ ] **No blocking operations**: Long-running tasks use proper async patterns
- [ ] **Resource cleanup**: Timers, intervals, connections properly closed
- [ ] **Error recovery**: Retry logic and circuit breakers where appropriate
- [ ] **Memory leaks**: Event listeners and resources properly disposed
- [ ] **API rate limiting**: External API calls respect rate limits and timeouts

## AI Assistant Workflow

When completing a task, AI assistants should:

1. **Make the changes** requested by the user
2. **Run linting**: `npm run lint` and fix any issues
3. **Run formatting**: `npm run format`
4. **Run tests**: `npm test` to verify nothing broke
5. **Verify quality**: Check all applicable items above
6. **Document if needed**: Update docs for significant changes
7. **Commit appropriately**: Use clear commit messages
8. **Report completion**: Summarize what was done and what quality checks passed

## Pre-Push Validation

Before pushing to remote, always run:

```bash
npm run lint && npm run format:check && npm test
```

Or use the comprehensive CI check:

```bash
npm run ci
```

## When to Skip Checks

Some checks may be skipped in specific situations:

- **Draft/WIP work**: Mark clearly with `[WIP]` in commit messages
- **Documentation only**: May skip tests if only markdown changed
- **Emergency hotfixes**: Document technical debt for follow-up

## Examples of Good Practices

### ✅ Good BDD Feature (Preferred for Business Logic)

```gherkin
Feature: Train Status Air Quality Mapping
  As a user
  I want train delays mapped to air quality levels
  So I can see train status in my smart home app

  Scenario: Train running on time
    Given a train with 0 minutes delay
    When I check the air quality
    Then it should be "Good (Green)"
    And the air quality value should be 1
```

### ✅ Good Commit Message

```
Add BDD tests for Matter server startup race condition

- Implement 7 Cucumber scenarios covering initialization sequence
- Test event listener timing and first status update capture
- Validate zero delay edge case and all delay ranges
- All 533 tests passing with proper formatting
```

### ✅ Good Unit Test (For Utilities)

```typescript
test('should emit statusChange event when train delay changes', () => {
  // Arrange: Set up device with initial state
  // Act: Trigger status update
  // Assert: Verify event emitted with correct data
});
```

### ✅ Good Error Handling

```typescript
try {
  const result = await rttSearch(config);
  return processResult(result);
} catch (error) {
  if (error instanceof RTTAPIError) {
    logger.error('RTT API failed', { error: error.message, code: error.code });
    throw new TrainSelectionError('Failed to fetch train data', { cause: error });
  }
  throw error;
}
```

## Enforcement

- **CI Pipeline**: GitHub Actions enforces linting, formatting, and tests
- **Pre-commit hooks**: Consider adding hooks for local validation (optional)
- **Code review**: Human reviewers verify quality standards are met
- **AI assistants**: Should validate these standards before marking work complete

## Related Documents

- [CONTRIBUTING.md](../CONTRIBUTING.md) - Contribution guidelines
- [README.md](../README.md) - Project overview
- [docs/](../docs/) - Technical documentation
- [tests/bdd/README.md](../tests/bdd/README.md) - BDD testing guide

---

**Note**: This is a living document. Update it as project standards evolve.
