// Quiet light Google map style for Android (iOS uses Apple Maps): warm white land,
// white roads, grey-lilac water, muted labels. Matches the Artemis palette.
export const MAP_STYLE = [
  { elementType: "geometry", stylers: [{ color: "#f1edea" }] },
  { elementType: "labels.icon", stylers: [{ visibility: "off" }] },
  { elementType: "labels.text.fill", stylers: [{ color: "#77707a" }] },
  { elementType: "labels.text.stroke", stylers: [{ color: "#f7f4f3" }] },
  { featureType: "poi", elementType: "geometry", stylers: [{ color: "#ebe7e3" }] },
  { featureType: "poi.park", elementType: "geometry", stylers: [{ color: "#e7e9e1" }] },
  { featureType: "road", elementType: "geometry", stylers: [{ color: "#ffffff" }] },
  { featureType: "road.highway", elementType: "geometry", stylers: [{ color: "#ffffff" }] },
  { featureType: "road.highway", elementType: "geometry.stroke", stylers: [{ color: "#e2dcd8" }] },
  { featureType: "transit", stylers: [{ visibility: "off" }] },
  { featureType: "water", elementType: "geometry", stylers: [{ color: "#e3e1eb" }] },
];

// Demo default: IIT Guwahati.
export const DEFAULT_CENTER = { latitude: 26.1878, longitude: 91.6916 };
