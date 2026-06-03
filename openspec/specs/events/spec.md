# events Specification

## Purpose
Allow users to browse, create, and manage group events; join events via invite token; and view the capsules contributed by all participants.

## Requirements

### Requirement: Events list
The system SHALL display a paginated list of events on the Events screen.

#### Scenario: Screen mounts
- GIVEN the user navigates to the Events tab
- WHEN `getEvents({ page: 1, pageSize: 20 })` calls GET /api/events/
- THEN display paginated Event objects

---

### Requirement: Event detail
The system SHALL show full event metadata and participant capsules on the Event Detail screen.

#### Scenario: Load event
- GIVEN a valid event id passed as a route param
- WHEN `getEvent(id)` calls GET /api/events/{id}/
- THEN display title, description, unlock_at, is_public, and the invite_token QR code / share link

---

### Requirement: Create event
The system SHALL create a new event and navigate to its detail screen.

#### Scenario: Valid form submission
- GIVEN title and future unlock_at provided, with optional description and is_public
- WHEN `createEvent(data, bannerUri?)` calls POST /api/events/
- THEN if bannerUri is provided, PATCH /api/events/{id}/ with multipart banner_image in a second call
- THEN navigate to the new event's detail screen

---

### Requirement: Update event
The system SHALL allow the event owner to edit metadata and/or upload a new banner.

#### Scenario: Metadata update
- GIVEN the owner submits the edit form
- WHEN `updateEvent(id, data)` calls PATCH /api/events/{id}/ with JSON fields
- THEN reflect the updated event in the detail screen

#### Scenario: Banner image update
- GIVEN the owner picks a new banner image
- WHEN updateEvent also provides bannerUri
- THEN a second PATCH /api/events/{id}/ is made with multipart/form-data `{ banner_image }`

---

### Requirement: Delete event
The system SHALL allow the owner to delete an event with a confirmation prompt.

#### Scenario: Owner confirms deletion
- GIVEN the user is the event owner and confirms the destructive action
- WHEN `deleteEvent(id)` calls DELETE /api/events/{id}/
- THEN navigate back to the Events list and remove the event from local state

---

### Requirement: Join event via invite link
The system SHALL create the user's personal capsule inside an event when they follow an invite link.

#### Scenario: Valid invite token
- GIVEN an invite deep link or QR scan resolves to an inviteToken
- WHEN the user submits title and optional description
- THEN POST /api/events/join/{inviteToken}/ creates the personal capsule
- THEN navigate to the new capsule's detail screen for content addition

#### Scenario: Already joined
- GIVEN the user has previously joined this event
- WHEN POST /api/events/join/{inviteToken}/ returns 400
- THEN display an error: "You have already joined this event" and navigate to the existing capsule

---

### Requirement: Participant capsule list
The system SHALL display all capsules in an event with enforced privacy.

#### Scenario: Event is not yet unlocked
- GIVEN current time < event.unlock_at
- WHEN `getEvent(id)` or a dedicated capsule-list call returns event capsules
- THEN display capsule metadata for all participants but NO contents for anyone

#### Scenario: Event is unlocked — own capsule
- GIVEN current time ≥ event.unlock_at and this is the user's own capsule
- THEN display the capsule with its contents (media pre-signed URLs valid 15 min)

#### Scenario: Event is unlocked — other participants' capsules
- GIVEN current time ≥ event.unlock_at and these are other participants' capsules
- THEN display only metadata (title, status, creator); contents remain hidden
