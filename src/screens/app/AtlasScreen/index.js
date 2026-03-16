import { View, Text, Pressable, StyleSheet, ActivityIndicator } from "react-native";
import { useEffect, useState, useCallback, useRef, useMemo } from "react";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import { SafeAreaView } from "react-native-safe-area-context";
import MapView, { Marker } from "react-native-maps";
import * as Location from "expo-location";
import { colors } from "@/constants";
import { getMapCapsules } from "@/services/capsules";

// Zoom thresholds (latitudeDelta)
const ZOOM_CITY   = 15;   // > 15 → city-level clusters
const ZOOM_AREA   = 3;    // 3-15 → neighbourhood clusters
const ZOOM_STREET = 0.5;  // < 0.5 → individual pins

function getClusterPrecision(latitudeDelta) {
  if (latitudeDelta > ZOOM_CITY) return 4;   // ~4° grid (city-level)
  if (latitudeDelta > ZOOM_AREA) return 1;   // ~1° grid (neighbourhood)
  if (latitudeDelta > ZOOM_STREET) return 0.2; // ~0.2° grid (block)
  return null; // individual pins
}

function clusterCapsules(capsules, latitudeDelta) {
  const precision = getClusterPrecision(latitudeDelta);

  if (precision === null) {
    // Individual pins — no clustering
    return capsules
      .filter((c) => c.latitude != null && c.longitude != null)
      .map((c) => ({
        id: c.id,
        coordinate: { latitude: c.latitude, longitude: c.longitude },
        count: 1,
        label: c.title || "Capsule",
        locationName: c.location_name || null,
        isCluster: false,
      }));
  }

  const buckets = {};
  capsules.forEach((c) => {
    if (c.latitude == null || c.longitude == null) return;
    const bLat = Math.round(c.latitude / precision) * precision;
    const bLng = Math.round(c.longitude / precision) * precision;
    const key = `${bLat.toFixed(4)},${bLng.toFixed(4)}`;
    if (!buckets[key]) {
      buckets[key] = {
        id: key,
        coordinate: { latitude: bLat, longitude: bLng },
        count: 0,
        locationNames: {},
        isCluster: true,
      };
    }
    buckets[key].count += 1;
    const loc = c.location_name;
    if (loc) {
      buckets[key].locationNames[loc] = (buckets[key].locationNames[loc] || 0) + 1;
    }
    // Keep representative coordinate as the first capsule's actual coord
    if (buckets[key].count === 1) {
      buckets[key].coordinate = { latitude: c.latitude, longitude: c.longitude };
    }
  });

  return Object.values(buckets).map((b) => {
    // Pick the most-common location name for this cluster
    const names = Object.entries(b.locationNames);
    const topName =
      names.length > 0
        ? names.sort((a, z) => z[1] - a[1])[0][0]
        : null;
    return { ...b, label: topName };
  });
}

// ─── Marker components ────────────────────────────────────────────────────────

function ClusterPin({ count, label }) {
  const display = count >= 1000 ? `${(count / 1000).toFixed(1)}k` : String(count);
  return (
    <View style={pinStyles.wrapper}>
      <View style={pinStyles.badge}>
        <Ionicons name="lock-closed" size={9} color={colors.primaryFg} />
        <Text style={pinStyles.count}>{display}</Text>
      </View>
      {label ? (
        <View style={pinStyles.labelBubble}>
          <Text style={pinStyles.labelText} numberOfLines={1}>
            {label} · {count} capsule{count !== 1 ? "s" : ""}
          </Text>
        </View>
      ) : null}
      <View style={pinStyles.tip} />
    </View>
  );
}

function SinglePin() {
  return (
    <View style={pinStyles.wrapper}>
      <View style={[pinStyles.badge, pinStyles.singleBadge]}>
        <Ionicons name="lock-closed" size={11} color={colors.primaryFg} />
      </View>
      <View style={pinStyles.tip} />
    </View>
  );
}

const pinStyles = StyleSheet.create({
  wrapper: {
    alignItems: "center",
  },
  badge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    backgroundColor: colors.primary,
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 10,
    shadowColor: colors.primary,
    shadowOpacity: 0.6,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 4,
  },
  singleBadge: {
    paddingHorizontal: 7,
  },
  count: {
    fontSize: 10,
    fontWeight: "700",
    color: colors.primaryFg,
  },
  labelBubble: {
    backgroundColor: "rgba(10,10,15,0.88)",
    borderRadius: 6,
    paddingHorizontal: 7,
    paddingVertical: 3,
    marginTop: 3,
    maxWidth: 160,
    borderWidth: 1,
    borderColor: colors.border,
  },
  labelText: {
    fontSize: 9,
    color: colors.foreground,
    fontWeight: "500",
  },
  tip: {
    width: 0,
    height: 0,
    borderLeftWidth: 5,
    borderRightWidth: 5,
    borderTopWidth: 7,
    borderLeftColor: "transparent",
    borderRightColor: "transparent",
    borderTopColor: colors.primary,
    marginTop: -1,
  },
});

// ─── Main screen ─────────────────────────────────────────────────────────────

export default function AtlasScreen() {
  const navigation = useNavigation();
  const mapRef = useRef(null);

  const [locationGranted, setLocationGranted] = useState(false);
  const [initialRegion, setInitialRegion] = useState(null);
  const [locating, setLocating] = useState(true);

  const [rawCapsules, setRawCapsules] = useState([]);
  const [currentRegion, setCurrentRegion] = useState(null);
  const [selectedPin, setSelectedPin] = useState(null);

  // ── Request location + set initial region ──────────────────────────────────
  useEffect(() => {
    (async () => {
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        const granted = status === "granted";
        setLocationGranted(granted);

        if (granted) {
          const pos = await Location.getCurrentPositionAsync({
            accuracy: Location.Accuracy.Balanced,
          });
          const region = {
            latitude: pos.coords.latitude,
            longitude: pos.coords.longitude,
            latitudeDelta: 0.5,
            longitudeDelta: 0.5,
          };
          setInitialRegion(region);
          setCurrentRegion(region);
          loadCapsules(region);
        } else {
          // Fallback to a broad view if location denied
          const region = {
            latitude: 37.7749,
            longitude: -122.4194,
            latitudeDelta: 20,
            longitudeDelta: 20,
          };
          setInitialRegion(region);
          setCurrentRegion(region);
          loadCapsules(region);
        }
      } catch {
        const region = {
          latitude: 37.7749,
          longitude: -122.4194,
          latitudeDelta: 20,
          longitudeDelta: 20,
        };
        setInitialRegion(region);
        setCurrentRegion(region);
        loadCapsules(region);
      } finally {
        setLocating(false);
      }
    })();
  }, []);

  // ── Load capsules for visible region ──────────────────────────────────────
  const loadCapsules = useCallback(async (region) => {
    try {
      const bounds = {
        lat_min: region.latitude - region.latitudeDelta / 2,
        lat_max: region.latitude + region.latitudeDelta / 2,
        lng_min: region.longitude - region.longitudeDelta / 2,
        lng_max: region.longitude + region.longitudeDelta / 2,
      };
      const data = await getMapCapsules(bounds);
      setRawCapsules(data);
    } catch {
      // keep existing data on error
    }
  }, []);

  const handleRegionChange = useCallback(
    (region) => {
      setCurrentRegion(region);
      loadCapsules(region);
    },
    [loadCapsules]
  );

  // ── Compute pins from raw capsules + zoom level ────────────────────────────
  const pins = useMemo(() => {
    if (!currentRegion) return [];
    return clusterCapsules(rawCapsules, currentRegion.latitudeDelta);
  }, [rawCapsules, currentRegion]);

  const totalCapsules = rawCapsules.length;
  const isZoomedIn = currentRegion && currentRegion.latitudeDelta <= ZOOM_STREET;

  // ── Re-center on user ──────────────────────────────────────────────────────
  const recenter = useCallback(async () => {
    if (!locationGranted) return;
    try {
      const pos = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });
      const region = {
        latitude: pos.coords.latitude,
        longitude: pos.coords.longitude,
        latitudeDelta: 0.5,
        longitudeDelta: 0.5,
      };
      mapRef.current?.animateToRegion(region, 600);
    } catch {}
  }, [locationGranted]);

  if (locating || !initialRegion) {
    return (
      <SafeAreaView style={styles.container} edges={["top"]}>
        <View style={styles.header}>
          <Pressable onPress={() => navigation.goBack()} style={styles.backBtn}>
            <Ionicons name="chevron-back" size={24} color={colors.foreground} />
          </Pressable>
          <View>
            <Text style={styles.headerSub}>EXPLORE</Text>
            <Text style={styles.headerTitle}>Atlas</Text>
          </View>
          <View style={{ width: 40 }} />
        </View>
        <View style={styles.centered}>
          <ActivityIndicator color={colors.primary} />
          <Text style={styles.locatingText}>Finding your location…</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      {/* Header */}
      <View style={styles.header}>
        <Pressable onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="chevron-back" size={24} color={colors.foreground} />
        </Pressable>
        <View>
          <Text style={styles.headerSub}>EXPLORE</Text>
          <Text style={styles.headerTitle}>Atlas</Text>
        </View>
        <View style={{ width: 40 }} />
      </View>

      {/* Map */}
      <View style={styles.mapContainer}>
        <MapView
          ref={mapRef}
          style={styles.map}
          initialRegion={initialRegion}
          showsUserLocation={locationGranted}
          showsCompass={false}
          showsScale={false}
          onRegionChangeComplete={handleRegionChange}
        >
          {pins.map((pin) => (
            <Marker
              key={pin.id}
              coordinate={pin.coordinate}
              onPress={() => setSelectedPin(pin)}
              tracksViewChanges={false}
            >
              {pin.isCluster ? (
                <ClusterPin count={pin.count} label={pin.label} />
              ) : (
                <SinglePin />
              )}
            </Marker>
          ))}
        </MapView>

        {/* Stats overlay */}
        <View style={styles.statsOverlay}>
          <View style={styles.statPill}>
            <Ionicons name="earth-outline" size={14} color={colors.primary} />
            <Text style={styles.statPillText}>{pins.length} locations</Text>
          </View>
          <View style={styles.statPill}>
            <Ionicons name="lock-closed-outline" size={14} color={colors.primary} />
            <Text style={styles.statPillText}>
              {totalCapsules.toLocaleString()} capsule{totalCapsules !== 1 ? "s" : ""}
            </Text>
          </View>
          {isZoomedIn && (
            <View style={[styles.statPill, styles.zoomPill]}>
              <Text style={styles.zoomPillText}>Individual pins</Text>
            </View>
          )}
        </View>

        {/* Re-center button */}
        {locationGranted && (
          <Pressable style={styles.recenterBtn} onPress={recenter}>
            <Ionicons name="locate-outline" size={20} color={colors.primary} />
          </Pressable>
        )}
      </View>

      {/* Selected pin card */}
      {selectedPin && (
        <View style={styles.pinCard}>
          <View style={styles.pinCardLeft}>
            <View style={styles.pinDot} />
            <View style={{ flex: 1 }}>
              <Text style={styles.pinTitle} numberOfLines={1}>
                {selectedPin.label ||
                  (selectedPin.isCluster ? "Clustered area" : "Public capsule")}
              </Text>
              <Text style={styles.pinCount}>
                {selectedPin.count.toLocaleString()} capsule
                {selectedPin.count !== 1 ? "s" : ""} sealed here
              </Text>
            </View>
          </View>
          <Pressable onPress={() => setSelectedPin(null)} style={styles.pinClose}>
            <Ionicons name="close" size={18} color={colors.mutedFg} />
          </Pressable>
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  centered: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
  },
  locatingText: {
    fontSize: 14,
    color: colors.mutedFg,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.card,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: colors.border,
  },
  headerSub: {
    fontSize: 10,
    color: colors.mutedFg,
    letterSpacing: 2,
    textTransform: "uppercase",
    textAlign: "center",
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: "300",
    color: colors.foreground,
    textAlign: "center",
  },
  mapContainer: {
    flex: 1,
    overflow: "hidden",
    position: "relative",
  },
  map: {
    width: "100%",
    height: "100%",
  },
  statsOverlay: {
    position: "absolute",
    top: 16,
    left: 16,
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  statPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "rgba(10,10,15,0.85)",
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.border,
  },
  statPillText: {
    fontSize: 12,
    color: colors.foreground,
    fontWeight: "500",
  },
  zoomPill: {
    borderColor: `${colors.primary}50`,
  },
  zoomPillText: {
    fontSize: 11,
    color: colors.primary,
    fontWeight: "500",
  },
  recenterBtn: {
    position: "absolute",
    bottom: 24,
    right: 16,
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "rgba(10,10,15,0.88)",
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOpacity: 0.3,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 6,
  },
  pinCard: {
    position: "absolute",
    bottom: 80,
    left: 16,
    right: 72,
    backgroundColor: colors.card,
    borderRadius: 16,
    padding: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderWidth: 1,
    borderColor: `${colors.primary}40`,
    shadowColor: "#000",
    shadowOpacity: 0.3,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 8,
  },
  pinCardLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    flex: 1,
  },
  pinDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: colors.primary,
    shadowColor: colors.primary,
    shadowOpacity: 0.8,
    shadowRadius: 6,
  },
  pinTitle: {
    fontSize: 14,
    fontWeight: "500",
    color: colors.foreground,
  },
  pinCount: {
    fontSize: 12,
    color: colors.mutedFg,
    marginTop: 2,
  },
  pinClose: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.secondaryBackground,
    alignItems: "center",
    justifyContent: "center",
    marginLeft: 8,
  },
});
