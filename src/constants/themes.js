export const darkColors = {
  background: "#0E0D0B",      // warm near-black, not cold blue-black
  secondaryBackground: "#1C1A16", // warm dark brown-grey
  card: "#181510",            // warm dark card, slight brown warmth
  primary: "#EAA646",         // brand gold — unchanged
  primaryFg: "#0E0D0B",
  secondary: "#C4714A",       // warm amber-terracotta
  foreground: "#F5EFE6",      // warm white, easier on eyes
  muted: "#1C1A16",
  mutedFg: "#9A9187",         // warm grey, not cold purple
  border: "#2E2920",          // warm dark border
  error: "#E05A5A",
  success: "#5BBF6A",
  errorStrong: "#C0392B",
  linear: "rgba(0, 0, 0, 0.7)"
};

export const lightColors = {
  background: "#F5F5F7",
  secondaryBackground: "#EEEDF1",
  card: "#FFFFFF",
  primary: "#D4922E",
  primaryFg: "#FFFFFF",
  secondary: "#C4714A",
  foreground: "#1A1A2E",
  muted: "#E8E7EC",
  mutedFg: "#6E6E80",
  border: "#D4D3DC",
  error: "#D04040",
  success: "#3A9340",
  errorStrong: "#B0201E",
  linear: "#54545492"
};

// Minimal dark map style for Google Maps (Android)
export const darkMapStyle = [
  { elementType: "geometry", stylers: [{ color: "#1a1710" }] },
  { elementType: "labels.text.fill", stylers: [{ color: "#9a9187" }] },
  { elementType: "labels.text.stroke", stylers: [{ color: "#1a1710" }] },
  {
    featureType: "administrative",
    elementType: "geometry.stroke",
    stylers: [{ color: "#2e2920" }],
  },
  {
    featureType: "administrative.land_parcel",
    elementType: "labels.text.fill",
    stylers: [{ color: "#6a6050" }],
  },
  {
    featureType: "landscape",
    elementType: "geometry",
    stylers: [{ color: "#181510" }],
  },
  {
    featureType: "poi",
    elementType: "geometry",
    stylers: [{ color: "#1c1a16" }],
  },
  {
    featureType: "poi",
    elementType: "labels.text.fill",
    stylers: [{ color: "#7a7060" }],
  },
  {
    featureType: "poi.park",
    elementType: "geometry",
    stylers: [{ color: "#1a2018" }],
  },
  {
    featureType: "poi.park",
    elementType: "labels.text.fill",
    stylers: [{ color: "#4a6a42" }],
  },
  {
    featureType: "road",
    elementType: "geometry",
    stylers: [{ color: "#2e2920" }],
  },
  {
    featureType: "road",
    elementType: "geometry.stroke",
    stylers: [{ color: "#1c1a16" }],
  },
  {
    featureType: "road",
    elementType: "labels.text.fill",
    stylers: [{ color: "#7a7060" }],
  },
  {
    featureType: "road.highway",
    elementType: "geometry",
    stylers: [{ color: "#3a3228" }],
  },
  {
    featureType: "road.highway",
    elementType: "geometry.stroke",
    stylers: [{ color: "#2e2920" }],
  },
  {
    featureType: "transit",
    elementType: "geometry",
    stylers: [{ color: "#1c1a16" }],
  },
  {
    featureType: "transit.station",
    elementType: "labels.text.fill",
    stylers: [{ color: "#7a7060" }],
  },
  {
    featureType: "water",
    elementType: "geometry",
    stylers: [{ color: "#0e0c09" }],
  },
  {
    featureType: "water",
    elementType: "labels.text.fill",
    stylers: [{ color: "#3a3228" }],
  },
];

// Minimal light map style for Google Maps (Android)
export const lightMapStyle = [
  { elementType: "geometry", stylers: [{ color: "#f0f0f4" }] },
  { elementType: "labels.text.fill", stylers: [{ color: "#6e6e80" }] },
  { elementType: "labels.text.stroke", stylers: [{ color: "#f5f5f7" }] },
  {
    featureType: "administrative",
    elementType: "geometry.stroke",
    stylers: [{ color: "#d4d3dc" }],
  },
  {
    featureType: "administrative.land_parcel",
    elementType: "labels.text.fill",
    stylers: [{ color: "#9e9eae" }],
  },
  {
    featureType: "landscape",
    elementType: "geometry",
    stylers: [{ color: "#eeedf1" }],
  },
  {
    featureType: "poi",
    elementType: "geometry",
    stylers: [{ color: "#e4e3e8" }],
  },
  {
    featureType: "poi",
    elementType: "labels.text.fill",
    stylers: [{ color: "#7a7a8e" }],
  },
  {
    featureType: "poi.park",
    elementType: "geometry",
    stylers: [{ color: "#dde8d8" }],
  },
  {
    featureType: "poi.park",
    elementType: "labels.text.fill",
    stylers: [{ color: "#5a8a4e" }],
  },
  {
    featureType: "road",
    elementType: "geometry",
    stylers: [{ color: "#ffffff" }],
  },
  {
    featureType: "road",
    elementType: "geometry.stroke",
    stylers: [{ color: "#d4d3dc" }],
  },
  {
    featureType: "road",
    elementType: "labels.text.fill",
    stylers: [{ color: "#7a7a8e" }],
  },
  {
    featureType: "road.highway",
    elementType: "geometry",
    stylers: [{ color: "#dadae0" }],
  },
  {
    featureType: "road.highway",
    elementType: "geometry.stroke",
    stylers: [{ color: "#c4c4cc" }],
  },
  {
    featureType: "transit",
    elementType: "geometry",
    stylers: [{ color: "#e0e0e6" }],
  },
  {
    featureType: "transit.station",
    elementType: "labels.text.fill",
    stylers: [{ color: "#7a7a8e" }],
  },
  {
    featureType: "water",
    elementType: "geometry",
    stylers: [{ color: "#c8d6e0" }],
  },
  {
    featureType: "water",
    elementType: "labels.text.fill",
    stylers: [{ color: "#8ea8b8" }],
  },
];
