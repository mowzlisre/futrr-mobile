# vault Specification

## Purpose
Display all capsules owned by or addressed to the authenticated user, separated by status, and provide quick access to capsule detail and creation.

## Requirements

### Requirement: Load capsule list
The system SHALL fetch and display all of the user's capsules on mount.

#### Scenario: Capsules exist
- GIVEN the user has at least one capsule (own or received)
- WHEN the Vault screen mounts or pull-to-refresh is triggered
- THEN `getCapsules()` calls GET /api/capsules/ and displays the returned array
  - Note: API may return a plain array or `{ results: [...] }`; client normalises to array

#### Scenario: No capsules
- GIVEN the user has no capsules
- WHEN getCapsules() returns an empty array
- THEN display an empty state prompt to create the first capsule

---

### Requirement: Capsule status filtering
The system SHALL allow the user to filter capsules by status (sealed / unlocked / expired / broken).

#### Scenario: Filter applied
- GIVEN the user selects a status filter tab
- THEN the displayed list is filtered client-side from the already-loaded array; no additional API call is made

---

### Requirement: Favorites access
The system SHALL provide access to the user's favorited capsules.

#### Scenario: Favorites tab selected
- GIVEN the user taps the Favorites tab
- WHEN `getFavorites()` calls GET /api/capsules/favorites/
- THEN display the favorited capsule list

---

### Requirement: Navigate to capsule detail
The system SHALL navigate to the Capsule Detail screen when a capsule is tapped.

#### Scenario: Capsule tapped
- GIVEN any capsule item in the list
- WHEN the user taps it
- THEN navigate to CapsuleDetailScreen with the capsule id as a route param

---

### Requirement: Open create capsule flow
The system SHALL allow the user to initiate capsule creation from the Vault.

#### Scenario: Create button tapped
- GIVEN the user taps the + / Create button
- THEN navigate to or open the Create Capsule modal/screen
