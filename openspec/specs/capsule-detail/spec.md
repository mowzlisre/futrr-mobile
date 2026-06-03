# capsule-detail Specification

## Purpose
Show a capsule's metadata and, when unlocked, its contents (text, photos, voice notes, video). Allow the owner to manage recipients, toggle public visibility, favorite the capsule, and delete it.

## Requirements

### Requirement: Load capsule
The system SHALL fetch and display the capsule on screen mount.

#### Scenario: Sealed capsule
- GIVEN the capsule has status=sealed
- WHEN `getCapsule(id)` calls GET /api/capsules/{id}/
- THEN display title, unlock date, recipients, and a countdown; contents section is hidden

#### Scenario: Unlocked capsule
- GIVEN the capsule has status=unlocked
- WHEN getCapsule(id) returns the Capsule object with a contents array
- THEN display all content items; media items use pre-signed S3 URLs (15-minute expiry — do NOT cache these URLs)

#### Scenario: BROKEN capsule
- GIVEN the API returns 410 Gone
- WHEN getCapsule(id) is called
- THEN display a BROKEN state UI; no content is accessible

---

### Requirement: Unlock capsule
The system SHALL attempt to unlock a sealed capsule when the user triggers the unlock action.

#### Scenario: Past unlock_at
- GIVEN current time ≥ capsule.unlock_at
- WHEN `unlockCapsule(id)` calls POST /api/capsules/{id}/unlock/
- THEN update local state with the returned unlocked Capsule object and reveal contents

#### Scenario: Before unlock_at
- GIVEN current time < capsule.unlock_at
- WHEN unlock is triggered
- THEN the API returns 403; display an error — do not update local state

---

### Requirement: Toggle favorite
The system SHALL let the user heart or un-heart a capsule from the detail screen.

#### Scenario: Toggle
- GIVEN the heart icon is tapped
- WHEN `toggleFavorite(id)` calls POST /api/capsules/{id}/favorite/
- THEN update the heart icon state based on `{ favorited }` in the response (201 = favorited, 200 = un-favorited)

---

### Requirement: Visibility update
The system SHALL allow the owner to toggle public visibility and Atlas listing from the detail screen.

#### Scenario: Owner updates visibility
- GIVEN the user is the capsule owner
- WHEN `updateVisibility(id, { is_public, listed_in_atlas, latitude, longitude, location_name })` calls PATCH /api/capsules/{id}/visibility/
- THEN reflect the updated values in the UI

---

### Requirement: Recipient management
The system SHALL allow the owner of a sealed capsule to add and remove recipients.

#### Scenario: Add recipient by user_id
- GIVEN a user selected from search results
- WHEN `addRecipient(id, { user_id })` calls POST /api/capsules/{id}/recipients/
- THEN add the recipient chip to the UI

#### Scenario: Add recipient by email
- GIVEN an email address typed by the owner
- WHEN `addRecipient(id, { email })` calls POST /api/capsules/{id}/recipients/
- THEN add the pending-recipient chip

#### Scenario: Remove recipient
- GIVEN the owner taps remove on a recipient chip
- WHEN `removeRecipient(capsuleId, recipientId)` calls DELETE /api/capsules/{id}/recipients/{recipientId}/
- THEN remove the chip from the UI

---

### Requirement: Accept / decline invitation
The system SHALL allow a recipient to accept or decline a capsule they were added to.

#### Scenario: Accept
- GIVEN the user is an invited recipient and taps Accept
- WHEN `acceptCapsuleInvitation(id)` calls POST /api/capsules/{id}/invitation/
- THEN update UI to show accepted state

#### Scenario: Decline
- GIVEN the user is an invited recipient and taps Decline
- WHEN `declineCapsuleInvitation(id)` calls DELETE /api/capsules/{id}/invitation/
- THEN remove the capsule from the user's Vault

---

### Requirement: Delete capsule
The system SHALL allow the owner to delete a sealed capsule with a confirmation prompt.

#### Scenario: Owner confirms deletion
- GIVEN status=sealed and the user is the owner
- WHEN confirmation is accepted and DELETE /api/capsules/{id}/ returns 204
- THEN navigate back to Vault and remove the capsule from local state
