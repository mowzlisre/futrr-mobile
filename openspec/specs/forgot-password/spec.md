# forgot-password Specification

## Purpose
Guide the user through a three-step OTP-gated flow to reset their password without being logged in.

## Requirements

### Requirement: Step 1 — Request OTP
The system SHALL send a reset OTP to the email associated with the identifier.

#### Scenario: Known identifier submitted
- GIVEN the user enters their email or username on the Forgot Password screen
- WHEN `forgotPassword(identifier)` calls POST /api/users/password/forget/ with `{ identifier }`
- THEN advance to the OTP entry step

#### Scenario: Unknown identifier
- GIVEN an identifier not in the system
- WHEN the API returns 400
- THEN display an inline error; remain on the identifier entry step

---

### Requirement: Step 2 — Verify OTP
The system SHALL verify the code entered by the user and obtain a session_token.

#### Scenario: Correct code entered
- GIVEN the correct OTP within the 60-minute window
- WHEN `verifyResetOTP(identifier, otp)` calls POST /api/users/password/verify-otp/
- THEN store the returned `session_token` in component state and advance to the new-password step

#### Scenario: Wrong or expired code
- GIVEN an incorrect OTP
- WHEN the API returns 400
- THEN display an error and allow the user to re-enter or request a new code

---

### Requirement: Step 3 — Set new password
The system SHALL set the new password using the session_token from the OTP step.

#### Scenario: Valid submission
- GIVEN session_token, new_password, and matching confirm_password
- WHEN `resetPassword(identifier, sessionToken, newPassword, confirmPassword)` calls POST /api/users/password/reset/ with `{ identifier, session_token, new_password, confirm_password }`
- THEN show a success message and navigate back to the Login screen

#### Scenario: Passwords do not match
- GIVEN new_password ≠ confirm_password
- THEN validate client-side before calling the API and show an inline error
