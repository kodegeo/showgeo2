# Test Suite - Showgeo 2.0 Backend

## Overview

This directory contains integration and end-to-end tests for the Showgeo 2.0 backend API.

## Test Structure

### Unit Tests (`.spec.ts`)
- Location: `src/modules/*/*.service.spec.ts`
- Purpose: Test individual service methods in isolation
- Use: Mock PrismaService and dependencies

### E2E Tests (`.e2e-spec.ts`)
- Location: `test/*.e2e-spec.ts`
- Purpose: Test full HTTP request/response flow
- Use: Real NestJS application with mocked database

### Test Utilities
- Location: `test/test-utils.ts`
- Purpose: Shared test utilities, mocks, and fixtures
- Use: Reusable test setup and data generation

## Running Tests

```bash
# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Run tests with coverage
npm run test:cov

# Run e2e tests
npm run test:e2e
```

## Test Files

### Unit Tests
- `src/modules/auth/auth.service.spec.ts` - Auth service tests
- `src/modules/users/users.service.spec.ts` - Users service tests
- `src/modules/events/events.service.spec.ts` - Events service tests
- `src/modules/payments/payments.service.spec.ts` - Payments service tests
- `src/modules/follow/follow.service.spec.ts` - Follow service tests
- `src/modules/store/store.service.spec.ts` - Store service tests
- `src/modules/analytics/analytics.service.spec.ts` - Analytics service tests
- `src/modules/notifications/notifications.service.spec.ts` - Notifications service tests

### E2E Tests
- `test/auth.e2e-spec.ts` - Authentication endpoints
- `test/app.e2e-spec.ts` - App health check

## Test Utilities

### TestUtils
- `createTestingModule()` - Creates a NestJS testing module
- `createTestApp()` - Creates a full NestJS application for E2E tests
- `createMockPrismaService()` - Creates a mock PrismaService with in-memory data
- `createTestUser()` - Creates a test user fixture
- `createTestEntity()` - Creates a test entity fixture

## Mock Data

The test utilities provide in-memory mock data stores that simulate Prisma behavior:
- Users
- Entities
- Events
- Stores
- Products
- Follows
- Orders
- Payments
- Notifications

## Best Practices

1. **Isolation**: Each test should be independent
2. **Cleanup**: Reset mock data between tests
3. **Mocking**: Mock external dependencies (Stripe, LiveKit, etc.)
4. **Fixtures**: Use test utilities to create consistent test data
5. **Coverage**: Aim for >80% code coverage

## Coverage Goals

- Services: 80%+
- Controllers: 70%+
- Guards/Decorators: 60%+

## Notes

- Tests use mocked PrismaService to avoid database dependencies
- Stripe and LiveKit are mocked in payment/streaming tests
- E2E tests require full app initialization (slower but more realistic)

