# auth-flow Specification

## Purpose
Handle user sign-in, Google OAuth, auth state persistence across app restarts, and sign-out from the mobile client.

## Requirements

### Requirement: Login screen presentation
The system SHALL show the Login screen to unauthenticated users and the main tab navigator to authenticated users.

#### Scenario: App launch with stored tokens
- GIVEN valid access + refresh tokens in SecureStore
- WHEN the app initialises in `AuthContext`
- THEN navigate directly to the main app without showing the Login screen

#### Scenario: App launch with no tokens
- GIVEN no tokens in SecureStore
- WHEN the app initialises
- THEN show the Login screen

---

### Requirement: Email/password login
The system SHALL authenticate the user and store the returned token pair.

#### Scenario: Successful login
- GIVEN valid credentials entered in the Login screen
- WHEN `loginUser(identifier, password)` calls POST /api/users/login/
- THEN save `{ access, refresh }` via `saveTokens()` to SecureStore and navigate to the main app

#### Scenario: Invalid credentials
- GIVEN wrong password or unknown identifier
- WHEN the login response is 401
- THEN display an inline error message; tokens are NOT stored

---

### Requirement: Google OAuth login
The system SHALL sign in using a Google ID token from the Google Sign-In SDK.

#### Scenario: Google sign-in succeeds
- GIVEN the user completes Google sign-in flow
- WHEN POST /api/users/oa/google/ with the Google `id_token`
- THEN save tokens and navigate to the main app (no difference in behaviour whether `created` is true or false)

---

### Requirement: Logout
The system SHALL clear all local tokens and return the user to the Login screen.

#### Scenario: Sign out
- GIVEN an authenticated user taps Sign Out (Profile screen)
- WHEN `logoutUser(refreshToken, accessToken)` calls POST /api/users/logout/ via raw axios (bypasses interceptor)
- THEN clear tokens from SecureStore via `clearTokens()`, emit forceLogout, navigate to Login
  - Note: errors are silently ignored — local tokens are always cleared regardless of server response

---

### Requirement: Forced logout on refresh failure
The system SHALL force the user back to the Login screen when the refresh token is no longer valid.

#### Scenario: authBus forceLogout event
- GIVEN the token refresh interceptor in `api.js` emits `authBus.forceLogout()`
- WHEN `AuthContext` receives the event
- THEN clear tokens and navigate to Login from any screen without user interaction
