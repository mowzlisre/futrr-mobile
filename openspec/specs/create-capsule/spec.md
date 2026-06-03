# create-capsule Specification

## Purpose
Guide the user through creating a new sealed capsule, attaching text/photo/voice/video content, setting an unlock date, and adding recipients.

## Requirements

### Requirement: Create the capsule shell
The system SHALL create the capsule record first before any content is attached.

#### Scenario: Valid unlock date provided
- GIVEN the user selects a future unlock_at and optional metadata (title, description, is_public, location)
- WHEN `createCapsule(data)` calls POST /api/capsules/
- THEN return the created Capsule object (status=sealed) and advance to the content step

#### Scenario: unlock_at in the past
- GIVEN the user selects a past date
- THEN the UI SHALL prevent submission with a validation error before calling the API

---

### Requirement: Add text content
The system SHALL attach a text message to the capsule.

#### Scenario: Text submitted
- GIVEN the user types a message and confirms
- WHEN `addCapsuleContent(id, { content_type: "text", body })` calls POST /api/capsules/{id}/contents/ with JSON
- THEN display a success indicator and allow additional content to be added

---

### Requirement: Add photo content
The system SHALL attach a photo chosen from the library or camera to the capsule.

#### Scenario: Photo selected
- GIVEN the user picks or captures a photo
- WHEN `addCapsuleContent(id, { content_type: "photo", file })` calls POST /api/capsules/{id}/contents/ with multipart/form-data
- THEN the server encrypts the file before S3 upload; display a thumbnail in the content list

---

### Requirement: Add voice note content
The system SHALL attach a recorded voice note to the capsule.

#### Scenario: Recording completed
- GIVEN the user finishes recording
- WHEN `addCapsuleContent(id, { content_type: "voice", file, duration })` calls POST /api/capsules/{id}/contents/ with multipart/form-data including duration in seconds
- THEN display the voice note waveform in the content list

---

### Requirement: Add video content
The system SHALL attach a video clip to the capsule.

#### Scenario: Video selected
- GIVEN the user picks a video from the library
- WHEN `addCapsuleContent(id, { content_type: "video", file, duration })` calls POST /api/capsules/{id}/contents/ with multipart/form-data
- THEN display a video thumbnail in the content list

---

### Requirement: Add recipients
The system SHALL allow the creator to send the capsule to specific users or email addresses.

#### Scenario: Add by user search
- GIVEN the user searches for and selects another Futrr user
- WHEN `addRecipient(id, { user_id })` calls POST /api/capsules/{id}/recipients/
- THEN display the recipient chip

#### Scenario: Add by email
- GIVEN the user types an email address directly
- WHEN `addRecipient(id, { email })` calls POST /api/capsules/{id}/recipients/
- THEN display a pending-recipient chip

---

### Requirement: Content type routing
The system SHALL route the content request correctly based on content_type.

#### Scenario: Text → JSON
- GIVEN content_type is "text"
- THEN send `Content-Type: application/json` with `{ content_type, body }`

#### Scenario: Media → multipart
- GIVEN content_type is "photo", "voice", or "video"
- THEN send `Content-Type: multipart/form-data` with `file` binary and optional `duration` field
