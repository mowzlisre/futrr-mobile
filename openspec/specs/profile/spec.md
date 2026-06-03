# profile Specification

## Purpose
Display the authenticated user's own profile with capsule stats, bio, and social counts; allow editing bio, username, and avatar; and view other users' public profiles with follow/unfollow controls.

## Requirements

### Requirement: Load own profile
The system SHALL load and display the authenticated user's full profile on the Profile screen.

#### Scenario: Profile screen mounts
- GIVEN the user navigates to the Profile tab
- WHEN `getProfile()` calls GET /api/users/me/
- THEN display id, email, username, avatar, bio, timezone, capsules_sealed, capsules_unlocked, and notification preferences

---

### Requirement: Load quota
The system SHALL display the user's capsule and storage quota.

#### Scenario: Quota loaded
- GIVEN the Profile screen mounts or the quota section is visible
- WHEN `getQuota()` calls GET /api/users/me/quota/
- THEN display capsules_used / capsules_limit and storage_used_bytes / storage_limit_bytes

---

### Requirement: Edit profile
The system SHALL allow the user to update their username, bio, timezone, and notification preferences.

#### Scenario: Profile form submitted
- GIVEN the user edits fields and submits
- WHEN `updateProfile(data)` calls PATCH /api/users/me/update/ with the changed fields
- THEN update the displayed profile with the server-confirmed values

---

### Requirement: Upload avatar
The system SHALL allow the user to pick a photo and upload it as their avatar.

#### Scenario: Photo picked
- GIVEN the user selects a photo from the library or camera
- WHEN `uploadAvatar(fileUri)` calls POST /api/users/me/avatar/ with multipart/form-data `{ avatar }`
- THEN update the avatar display with the returned pre-signed URL

---

### Requirement: View other user's profile
The system SHALL show another user's public profile when navigated to from search or discover.

#### Scenario: Public profile screen opened
- GIVEN a userId route param
- WHEN `getUserProfile(userId)` calls GET /api/users/{userId}/
- THEN display their username, avatar, bio, and public capsule count

---

### Requirement: Follow / unfollow
The system SHALL allow the user to follow or unfollow another user from their profile screen.

#### Scenario: Follow button tapped (not following)
- GIVEN the user is not following this person
- WHEN `followUser(userId)` calls POST /api/users/{userId}/follow/
- THEN update the button state to Following (or Requested if account is private)

#### Scenario: Following button tapped (already following)
- GIVEN the user is already following this person
- WHEN `unfollowUser(userId)` calls DELETE /api/users/{userId}/unfollow/
- THEN update the button state to Follow

---

### Requirement: Follow requests
The system SHALL display and allow management of incoming follow requests.

#### Scenario: Follow requests loaded
- GIVEN pending follow requests exist
- WHEN `getFollowRequests()` calls GET /api/users/me/follow-requests/
- THEN list pending requestors with Accept and Reject actions

#### Scenario: Accept request
- GIVEN a requestId
- WHEN `acceptFollowRequest(requestId)` calls POST /api/users/follow-requests/{requestId}/accept/
- THEN remove from the pending list

#### Scenario: Reject request
- GIVEN a requestId
- WHEN `rejectFollowRequest(requestId)` calls DELETE /api/users/follow-requests/{requestId}/reject/
- THEN remove from the pending list
