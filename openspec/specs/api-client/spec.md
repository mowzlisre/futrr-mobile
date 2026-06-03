# api-client Specification

## Purpose
Provide a single configured axios instance used by all service modules, handling base URL, JWT token injection, silent token refresh on 401, and forced logout when refresh fails.

## Requirements

### Requirement: Base configuration
The system SHALL configure a single axios instance with the production base URL and a 10-second timeout.

#### Scenario: Client initialised
- GIVEN the app starts
- THEN `src/services/api.js` exports an axios instance pointed at `https://api.futrr.app/api` with `Content-Type: application/json` and timeout 10 000 ms

---

### Requirement: Access token injection
The system SHALL attach the stored access token to every outgoing request.

#### Scenario: Token present
- GIVEN an access token is stored in SecureStore
- WHEN any API request is made
- THEN the `Authorization: Bearer <access_token>` header is injected before the request leaves the device

#### Scenario: No token stored
- GIVEN no token in SecureStore (unauthenticated state)
- WHEN any API request is made
- THEN the request is sent without an Authorization header

---

### Requirement: Silent token refresh on 401
The system SHALL intercept a 401 response, refresh the access token once, and retry the original request transparently to the caller.

#### Scenario: First 401 with valid refresh token
- GIVEN a 401 response and a non-expired refresh token in SecureStore
- WHEN the interceptor handles the error
- THEN POST /api/token/refresh/ silently, save the new access token, and retry the original request with the new token

#### Scenario: Concurrent 401 responses during refresh
- GIVEN multiple requests fail with 401 simultaneously
- WHEN one refresh is already in-flight
- THEN queue all other failed requests and resolve/reject them together when the refresh completes (no duplicate refresh calls)

#### Scenario: Refresh fails (token expired or blacklisted)
- GIVEN the refresh token is expired or invalid
- WHEN POST /api/token/refresh/ returns 401
- THEN clear all local tokens, emit a forceLogout event via authBus, and reject the original request

---

### Requirement: Service module pattern
Each feature SHALL have its own service file in `src/services/` that imports the shared `api` instance and wraps calls in named exported functions.

#### Scenario: Service function error contract
- GIVEN any API call that returns a non-2xx status
- WHEN the service function catches the error
- THEN throw `err.response?.data` or a fallback `{ error: "..." }` object — never the raw axios error

Service files:
- `auth.js` — login, logout, forgot/reset password
- `capsules.js` — capsule CRUD, content, recipients, favorites
- `events.js` — events CRUD, join
- `discover.js` — feeds and search
- `notifications.js` — list and mark-read
- `user.js` — profile, avatar, social, quota, support, delete account
- `onboarding.js` — OTP flow, registration, preboarding
- `storage.js` — SecureStore helpers for token persistence
