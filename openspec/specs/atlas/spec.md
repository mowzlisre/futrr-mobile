# atlas Specification

## Purpose
Display a map (OsmMapView) showing public, location-tagged capsule pins within the user's current map viewport, and allow tapping a pin to view the capsule.

## Requirements

### Requirement: Fetch capsules for visible map region
The system SHALL load capsule pins whenever the visible map region changes.

#### Scenario: Region changes (pan or zoom)
- GIVEN the user pans or zooms the map
- WHEN the map region settles
- THEN `getMapCapsules({ lat_min, lat_max, lng_min, lng_max, limit: 50 })` calls GET /api/capsules/map/ with the bounding box of the current viewport

#### Scenario: Missing bounding box
- GIVEN the viewport bounding box cannot be determined
- THEN do NOT call the API; display no pins

---

### Requirement: Display capsule pins
The system SHALL render a pin on the map for each capsule returned.

#### Scenario: Capsules in viewport
- GIVEN the API returns an array of capsules with latitude/longitude
- THEN render one map marker per capsule at its coordinates
- THEN show the capsule title or a preview on the pin callout

#### Scenario: No capsules in viewport
- GIVEN the API returns an empty array
- THEN show no pins (no error state needed)

---

### Requirement: Tap a pin to view capsule
The system SHALL allow the user to navigate to the Capsule Detail screen from the map.

#### Scenario: Pin tapped
- GIVEN a capsule pin is tapped
- THEN navigate to CapsuleDetailScreen with the capsule id

---

### Requirement: Map component
The system SHALL use the OsmMapView component (OpenStreetMap) from `src/components/ui/OsmMapView`.

#### Scenario: Map renders
- GIVEN the Atlas screen mounts
- THEN OsmMapView is rendered with the device's current location as the initial region (if location permission is granted)

#### Scenario: Location permission denied
- GIVEN the user has denied location permission
- THEN render the map centered on a default location without requesting permission again
