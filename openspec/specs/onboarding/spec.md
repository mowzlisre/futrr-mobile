# onboarding Specification

## Purpose
Guide a new user through multi-step email-verified registration and capture preboarding preferences before they reach the main app.

## Requirements

### Requirement: Email availability check
The system SHALL verify an email is not already registered before proceeding.

#### Scenario: Available email
- GIVEN the user enters an email on the first registration step
- WHEN `checkEmail(email)` calls GET /api/users/check-email/?email=...
- THEN allow the user to continue to the OTP step

#### Scenario: Taken email
- GIVEN an email already registered
- WHEN checkEmail returns `{ available: false }`
- THEN show an inline error and block progression

---

### Requirement: OTP send and verify
The system SHALL send an OTP to the email and verify it before allowing registration.

#### Scenario: Send OTP
- GIVEN a valid, available email
- WHEN `sendOTP(email)` calls POST /api/users/email/send-otp/
- THEN advance to the OTP entry screen

#### Scenario: Correct OTP entered
- GIVEN the correct code is entered within the expiry window
- WHEN `verifyOTP(email, otp)` calls POST /api/users/email/verify-otp/
- THEN store the returned `session_token` in component state for the next step

#### Scenario: Wrong OTP
- GIVEN an incorrect code
- WHEN verifyOTP returns an error
- THEN show an error and allow the user to retry or re-request a code

---

### Requirement: Username check
The system SHALL prevent the user from choosing an already-taken username.

#### Scenario: Available username
- GIVEN a username entered on the username step
- WHEN `checkUsername(username)` calls GET /api/users/check-username/?username=...
- THEN allow progression to the password step

---

### Requirement: Complete registration
The system SHALL create the account and log the user in automatically.

#### Scenario: Valid form submission
- GIVEN email, session_token (from OTP step), username, and password
- WHEN `completeRegistration(email, sessionToken, username, password)` calls POST /api/users/register/
- THEN save the returned tokens via `saveTokens()` and navigate to the preboarding screen

---

### Requirement: Preboarding preferences
The system SHALL collect timezone, bio, and notification preferences before the user enters the main app.

#### Scenario: User completes preboarding
- GIVEN the preboarding form is submitted
- WHEN `completePreboarding(payload)` calls PATCH /api/users/preboarding/complete/
- THEN navigate to the main app (Vault / Home tab)

#### Scenario: User skips preboarding
- GIVEN optional preboarding fields are left blank
- WHEN preboarding is submitted with empty or default values
- THEN navigate to the main app with server defaults applied
