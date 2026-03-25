export const darkColors = {
  background: "#0A0A0F",
  secondaryBackground: "#1A1826",
  card: "#151120",
  primary: "#EAA646",
  primaryFg: "#0A0A0F",
  secondary: "#C4714A",
  foreground: "#FAF7F2",
  muted: "#1A1826",
  mutedFg: "#8A8A99",
  border: "#2A2640",
  error: "#E05A5A",
  success: "#4CAF50",
  errorStrong: "#c0392b",
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
  { elementType: "geometry", stylers: [{ color: "#1d1d2b" }] },
  { elementType: "labels.text.fill", stylers: [{ color: "#8a8a99" }] },
  { elementType: "labels.text.stroke", stylers: [{ color: "#1d1d2b" }] },
  {
    featureType: "administrative",
    elementType: "geometry.stroke",
    stylers: [{ color: "#2a2640" }],
  },
  {
    featureType: "administrative.land_parcel",
    elementType: "labels.text.fill",
    stylers: [{ color: "#5a5a6e" }],
  },
  {
    featureType: "landscape",
    elementType: "geometry",
    stylers: [{ color: "#151120" }],
  },
  {
    featureType: "poi",
    elementType: "geometry",
    stylers: [{ color: "#1a1826" }],
  },
  {
    featureType: "poi",
    elementType: "labels.text.fill",
    stylers: [{ color: "#6e6e80" }],
  },
  {
    featureType: "poi.park",
    elementType: "geometry",
    stylers: [{ color: "#1a2218" }],
  },
  {
    featureType: "poi.park",
    elementType: "labels.text.fill",
    stylers: [{ color: "#4a6a42" }],
  },
  {
    featureType: "road",
    elementType: "geometry",
    stylers: [{ color: "#2a2640" }],
  },
  {
    featureType: "road",
    elementType: "geometry.stroke",
    stylers: [{ color: "#1a1826" }],
  },
  {
    featureType: "road",
    elementType: "labels.text.fill",
    stylers: [{ color: "#6e6e80" }],
  },
  {
    featureType: "road.highway",
    elementType: "geometry",
    stylers: [{ color: "#3a3550" }],
  },
  {
    featureType: "road.highway",
    elementType: "geometry.stroke",
    stylers: [{ color: "#2a2640" }],
  },
  {
    featureType: "transit",
    elementType: "geometry",
    stylers: [{ color: "#1a1826" }],
  },
  {
    featureType: "transit.station",
    elementType: "labels.text.fill",
    stylers: [{ color: "#6e6e80" }],
  },
  {
    featureType: "water",
    elementType: "geometry",
    stylers: [{ color: "#0e0e1a" }],
  },
  {
    featureType: "water",
    elementType: "labels.text.fill",
    stylers: [{ color: "#3a3a50" }],
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
