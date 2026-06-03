# settings Specification

## Purpose
Provide access to security settings (password change, 2FA device management), notification preferences, support ticket submission, and permanent account deletion.

## Requirements

### Requirement: Change password
The system SHALL allow the user to change their password from Settings → Security.

#### Scenario: Correct old password
- GIVEN the user fills in old_password, new_password, confirm_password
- WHEN the form is submitted and POST /api/users/password/change/ returns 200
- THEN show a success message and clear the form

#### Scenario: Wrong old password
- GIVEN an incorrect old_password
- WHEN the API returns 403
- THEN display an inline error without navigating away

---

### Requirement: 2FA device list
The system SHALL display all registered 2FA devices in Settings → Security.

#### Scenario: Devices loaded
- GIVEN the security section is opened
- WHEN GET /api/users/2fa/devices/ returns a device list
- THEN render each device with its type, name, verified status, and a Remove button

---

### Requirement: Add 2FA device
The system SHALL guide the user through adding a new TOTP, SMS, or email device.

#### Scenario: TOTP device added
- GIVEN the user selects TOTP and provides a device_name
- WHEN POST /api/users/2fa/device/add/ returns `{ secret, provisioning_uri }`
- THEN display a QR code rendered from provisioning_uri for the user to scan in their authenticator app

#### Scenario: Device verified
- GIVEN the user enters the 6-digit code from their authenticator
- WHEN POST /api/users/2fa/device/verify/ with `{ device_id, code }` returns 200
- THEN mark the device as verified in the list

---

### Requirement: Remove 2FA device
The system SHALL allow the user to unlink a 2FA device.

#### Scenario: Remove confirmed
- GIVEN the user taps Remove and confirms the action
- WHEN POST /api/users/2fa/device/remove/ with `{ device_id }` returns 200
- THEN remove the device from the list

---

### Requirement: Notification preferences
The system SHALL allow the user to toggle email and push notification settings.

#### Scenario: Toggle updated
- GIVEN the user flips the notification_email or notification_push switch
- WHEN `updateProfile({ notification_email, notification_push })` calls PATCH /api/users/me/update/
- THEN persist the preference and reflect the new toggle state

---

### Requirement: Submit support ticket
The system SHALL allow the user to open a support ticket from Settings.

#### Scenario: Ticket submitted
- GIVEN category, subject, and message are provided
- WHEN `createSupportTicket({ category, subject, message })` calls POST /api/users/support/
- THEN show a confirmation and navigate back

#### Scenario: View ticket history
- GIVEN the user navigates to ticket history
- WHEN `getSupportTickets()` calls GET /api/users/support/tickets/
- THEN display a list of tickets with status badges

---

### Requirement: Delete account
The system SHALL allow the user to permanently delete their account after confirmation and password re-entry.

#### Scenario: Deletion confirmed
- GIVEN the user completes the multi-step confirmation and enters their password
- WHEN `deleteAccount(password)` calls DELETE /api/users/delete-account/ (or /api/auth/delete-account/) with `{ password }`
- THEN on 200: clear local tokens, navigate to Login, and display a farewell message

#### Scenario: Wrong password
- GIVEN incorrect password entered
- WHEN the API returns 403
- THEN display an error; the account is NOT deleted
