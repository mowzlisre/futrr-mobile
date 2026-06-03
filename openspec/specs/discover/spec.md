# discover Specification

## Purpose
Show authenticated users a curated public feed of capsules and events, a friends-only feed, and a unified search bar across capsules, people, and events.

## Requirements

### Requirement: Global trending feed on mount
The system SHALL load the global trending feed when the Discover screen mounts.

#### Scenario: Screen mounts
- GIVEN the user navigates to the Discover tab
- WHEN `getGlobalFeed()` calls GET /api/discover/global/
- THEN display `{ events: [...], capsules: [...] }` in their respective sections

---

### Requirement: Friends feed
The system SHALL show a paginated feed of capsules from users the authenticated user follows.

#### Scenario: Friends tab selected
- GIVEN the user switches to the Friends tab
- WHEN `getFriendsFeed({ page: 1, pageSize: 20 })` calls GET /api/discover/friends/
- THEN display paginated capsule results from followed users

#### Scenario: Load more (infinite scroll)
- GIVEN the user scrolls to the bottom of the friends feed
- WHEN the next page is requested
- THEN append the next page of results to the existing list

---

### Requirement: Unified search
The system SHALL search across capsules, people, and events as the user types.

#### Scenario: Search query entered
- GIVEN the user types in the search bar
- WHEN `searchDiscover(query)` calls GET /api/discover/search/?q=...
- THEN display results grouped into Capsules, People, and Events sections

#### Scenario: Empty search bar
- GIVEN the search bar is cleared
- THEN hide search results and restore the default feed view

---

### Requirement: Navigate from search result
The system SHALL navigate to the appropriate detail screen when a search result is tapped.

#### Scenario: Capsule result tapped
- GIVEN a capsule appears in search results
- WHEN the user taps it
- THEN navigate to CapsuleDetailScreen

#### Scenario: Person result tapped
- GIVEN a user appears in search results
- WHEN the user taps it
- THEN navigate to the public user profile screen

#### Scenario: Event result tapped
- GIVEN an event appears in search results
- WHEN the user taps it
- THEN navigate to EventDetailScreen
