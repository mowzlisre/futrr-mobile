# notifications Specification

## Purpose
Display in-app notifications (capsule unlocks, event joins, recipient invitations, system messages) and allow the user to mark them as read.

## Requirements

### Requirement: Load notifications
The system SHALL fetch and display notifications on the Notifications screen.

#### Scenario: Screen mounts
- GIVEN the user navigates to the Notifications tab
- WHEN `getNotifications()` calls GET /api/notifications/
- THEN display notifications sorted newest-first; each row shows title, body, timestamp, and read state

#### Scenario: Unread-only filter
- GIVEN the user activates an "Unread" filter
- WHEN `getNotifications({ unreadOnly: true })` calls GET /api/notifications/?unread_only=true
- THEN display only unread notifications

---

### Requirement: Mark notification as read
The system SHALL mark a notification as read when the user taps it or views its detail.

#### Scenario: Notification tapped
- GIVEN a notification with is_read=false
- WHEN the user taps the notification row
- THEN `markNotificationRead(id)` calls PATCH /api/notifications/{id}/read/
- THEN update the row's visual state to read (dimmed or no unread indicator)

#### Scenario: Already read
- GIVEN a notification with is_read=true
- WHEN the user taps it
- THEN no API call is necessary (optimistic check before calling)

---

### Requirement: Deep link from notification
The system SHALL navigate to the relevant screen when a notification is tapped.

#### Scenario: capsule_unlocked notification
- GIVEN a notification with type=capsule_unlocked and related_capsule UUID
- WHEN the user taps it
- THEN navigate to CapsuleDetailScreen with the related_capsule id

#### Scenario: event_joined or event_unlocked notification
- GIVEN a notification with related_event UUID
- WHEN the user taps it
- THEN navigate to EventDetailScreen with the related_event id

#### Scenario: system notification
- GIVEN a notification with type=system
- WHEN the user taps it
- THEN show the notification body in a modal or detail view; no navigation to another screen

---

### Requirement: Unread badge
The system SHALL display an unread count badge on the Notifications tab icon.

#### Scenario: Unread notifications exist
- GIVEN getNotifications() returns results with is_read=false
- THEN show a badge count on the tab bar icon equal to the number of unread items

#### Scenario: All read
- GIVEN all notifications have is_read=true
- THEN hide the badge
