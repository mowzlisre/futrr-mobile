/**
 * OsmMapView — Android-only OpenStreetMap via WebView + Leaflet.
 * API mirrors react-native-maps MapView so screens can Platform.select easily.
 *
 * Props:
 *   style, initialRegion, onRegionChangeComplete
 *   markers: [{ id, coordinate:{latitude,longitude}, isCluster, count }]
 *   onMarkerPress: (marker) => void
 *   showsUserLocation: boolean
 *   isDark: boolean
 *   primaryColor: string  (hex)
 *
 * Ref methods:
 *   animateToRegion({ latitude, longitude, latitudeDelta, longitudeDelta })
 */

import {
  View,
  StyleSheet,
  Platform,
} from "react-native";
import {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
} from "react";
import { WebView } from "react-native-webview";

// ─── Tile themes ──────────────────────────────────────────────────────────────

const TILE_LIGHT = "https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png";
const TILE_DARK  = "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png";
const ATTR       = '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>';

// ─── Leaflet HTML ─────────────────────────────────────────────────────────────

function buildHtml({ isDark, lat, lng, zoom, primaryColor }) {
  const tile = isDark ? TILE_DARK : TILE_LIGHT;
  const bg   = isDark ? "#0E0D0B" : "#F5F5F7";

  return `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8"/>
<meta name="viewport" content="width=device-width,initial-scale=1,maximum-scale=1,user-scalable=no"/>
<link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css"/>
<style>
  *{margin:0;padding:0;box-sizing:border-box}
  html,body,#map{width:100%;height:100%;background:${bg}}
  .leaflet-attribution-flag{display:none!important}
  .l-cluster{
    display:flex;align-items:center;justify-content:center;
    background:${primaryColor};border-radius:50%;
    color:#fff;font-weight:700;font-size:13px;font-family:sans-serif;
    border:2.5px solid rgba(255,255,255,0.55);
    box-shadow:0 2px 8px rgba(0,0,0,0.35);
  }
  .l-single{
    background:${primaryColor};border-radius:50%;
    border:2.5px solid rgba(255,255,255,0.8);
    box-shadow:0 2px 6px rgba(0,0,0,0.4);
  }
  .l-public{
    background:transparent;border-radius:50%;
    border:2.5px solid ${primaryColor};
    box-shadow:0 1px 4px rgba(0,0,0,0.35);
  }
  .l-user{
    background:#4285F4;border-radius:50%;
    border:2.5px solid #fff;
    box-shadow:0 1px 4px rgba(0,0,0,0.4);
  }
</style>
</head>
<body>
<div id="map"></div>
<script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
<script>
var map = L.map('map',{zoomControl:false,attributionControl:false})
         .setView([${lat},${lng}],${zoom});

L.tileLayer('${tile}',{maxZoom:19,subdomains:['a','b','c']}).addTo(map);

var _markers = {};
var _userMarker = null;

map.on('moveend', function(){
  var c = map.getCenter(), b = map.getBounds();
  window.ReactNativeWebView.postMessage(JSON.stringify({
    type:'regionchange',
    latitude:c.lat, longitude:c.lng,
    latitudeDelta:b.getNorth()-b.getSouth(),
    longitudeDelta:b.getEast()-b.getWest()
  }));
});

function makeIcon(m){
  if(m.isCluster){
    var s=Math.max(32,Math.min(48,28+m.count));
    var inner = m.pinType==='own' && m.avatarUrl
      ? '<img src="'+m.avatarUrl+'" style="width:100%;height:100%;border-radius:50%;object-fit:cover;"/>'
      : (m.count >= 2 ? m.count : '');
    return L.divIcon({className:'',iconSize:[s,s],iconAnchor:[s/2,s/2],
      html:'<div class="l-cluster" style="width:'+s+'px;height:'+s+'px;overflow:hidden;">'+inner+'</div>'});
  }
  if(m.pinType==='public'){
    return L.divIcon({className:'',iconSize:[14,14],iconAnchor:[7,7],
      html:'<div class="l-public" style="width:14px;height:14px"></div>'});
  }
  // Own pin — avatar circle if available, solid fill otherwise
  if(m.avatarUrl){
    return L.divIcon({className:'',iconSize:[28,28],iconAnchor:[14,14],
      html:'<div style="width:28px;height:28px;border-radius:50%;overflow:hidden;border:2.5px solid rgba(255,255,255,0.9);box-shadow:0 2px 6px rgba(0,0,0,0.4);"><img src="'+m.avatarUrl+'" style="width:100%;height:100%;object-fit:cover;"/></div>'});
  }
  return L.divIcon({className:'',iconSize:[12,12],iconAnchor:[6,6],
    html:'<div class="l-single" style="width:12px;height:12px"></div>'});
}

window.syncMarkers = function(list){
  var seen = {};
  list.forEach(function(m){
    seen[m.id] = true;
    var existing = _markers[m.id];
    if(existing){
      existing.setLatLng([m.lat,m.lng]);
      existing.setIcon(makeIcon(m));
    } else {
      var mk = L.marker([m.lat,m.lng],{icon:makeIcon(m)}).addTo(map);
      mk.on('click',function(){
        window.ReactNativeWebView.postMessage(JSON.stringify({type:'markerpress',id:m.id}));
      });
      _markers[m.id]=mk;
    }
  });
  Object.keys(_markers).forEach(function(id){
    if(!seen[id]){ map.removeLayer(_markers[id]); delete _markers[id]; }
  });
};

window.animateToRegion = function(lat,lng,latD,lngD){
  map.flyTo([lat,lng], map.getBoundsZoom(
    L.latLngBounds([lat-latD/2,lng-lngD/2],[lat+latD/2,lng+lngD/2])
  ),{duration:0.6});
};

window.setUserLocation = function(lat,lng){
  if(_userMarker){ map.removeLayer(_userMarker); }
  _userMarker = L.marker([lat,lng],{icon:L.divIcon({
    className:'',iconSize:[14,14],iconAnchor:[7,7],
    html:'<div class="l-user" style="width:14px;height:14px"></div>'
  })}).addTo(map);
};

var _radiusCircle = null;
window.setRadiusCircle = function(lat,lng,radiusM,color){
  if(_radiusCircle){ map.removeLayer(_radiusCircle); }
  _radiusCircle = L.circle([lat,lng],{
    radius:radiusM,
    color:color,
    fillColor:color,
    fillOpacity:0.08,
    weight:2,
    opacity:0.5,
    dashArray:'6 4',
  }).addTo(map);
};
window.clearRadiusCircle = function(){
  if(_radiusCircle){ map.removeLayer(_radiusCircle); _radiusCircle=null; }
};
</script>
</body>
</html>`;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function regionToZoom(region) {
  const lngDelta = region?.longitudeDelta ?? 0.05;
  return Math.min(18, Math.max(1, Math.round(Math.log2(360 / lngDelta))));
}

// ─── Component ────────────────────────────────────────────────────────────────

const OsmMapView = forwardRef(function OsmMapView(
  {
    style,
    initialRegion,
    onRegionChangeComplete,
    markers = [],
    onMarkerPress,
    showsUserLocation = false,
    userLocation,
    isDark = false,
    primaryColor = "#EAA646",
    radiusCircle = null,
    children,
  },
  ref,
) {
  const webViewRef = useRef(null);
  const [ready, setReady] = useState(false);
  const markerPressHandlers = useRef({});

  const inject = useCallback((js) => {
    webViewRef.current?.injectJavaScript(js + ";true;");
  }, []);

  // Sync markers whenever they change (after map is ready)
  useEffect(() => {
    if (!ready) return;
    const list = markers.map((m) => ({
      id: m.id ?? String(m.coordinate.latitude) + String(m.coordinate.longitude),
      lat: m.coordinate.latitude,
      lng: m.coordinate.longitude,
      isCluster: !!m.isCluster,
      count: m.count ?? 0,
      pinType: m.pinType ?? "own",
      avatarUrl: m.avatarUrl ?? null,
    }));
    // Store press handlers keyed by id
    markers.forEach((m) => {
      const id = m.id ?? String(m.coordinate.latitude) + String(m.coordinate.longitude);
      markerPressHandlers.current[id] = m.onPress ?? (() => onMarkerPress?.(m));
    });
    inject(`window.syncMarkers(${JSON.stringify(list)})`);
  }, [ready, markers, inject, onMarkerPress]);

  // User location dot
  useEffect(() => {
    if (!ready || !showsUserLocation || !userLocation) return;
    inject(`window.setUserLocation(${userLocation.latitude},${userLocation.longitude})`);
  }, [ready, showsUserLocation, userLocation, inject]);

  // Radius circle
  useEffect(() => {
    if (!ready) return;
    if (radiusCircle) {
      inject(`window.setRadiusCircle(${radiusCircle.latitude},${radiusCircle.longitude},${radiusCircle.radiusMeters},"${primaryColor}")`);
    } else {
      inject(`window.clearRadiusCircle()`);
    }
  }, [ready, radiusCircle, inject, primaryColor]);

  // Expose ref API
  useImperativeHandle(ref, () => ({
    animateToRegion: (region) => {
      inject(
        `window.animateToRegion(${region.latitude},${region.longitude},${region.latitudeDelta},${region.longitudeDelta})`,
      );
    },
  }));

  const onMessage = useCallback(
    (e) => {
      try {
        const msg = JSON.parse(e.nativeEvent.data);
        if (msg.type === "regionchange") {
          onRegionChangeComplete?.({
            latitude: msg.latitude,
            longitude: msg.longitude,
            latitudeDelta: msg.latitudeDelta,
            longitudeDelta: msg.longitudeDelta,
          });
        } else if (msg.type === "markerpress") {
          markerPressHandlers.current[msg.id]?.();
        }
      } catch {}
    },
    [onRegionChangeComplete],
  );

  const region = initialRegion ?? {
    latitude: 0, longitude: 0, latitudeDelta: 0.05, longitudeDelta: 0.05,
  };

  const html = useMemo(
    () =>
      buildHtml({
        isDark,
        lat: region.latitude,
        lng: region.longitude,
        zoom: regionToZoom(region),
        primaryColor,
      }),
    // Only rebuild if theme / color changes — not on every region update
    [isDark, primaryColor],
  );

  return (
    <View style={[styles.root, style]}>
      <WebView
        ref={webViewRef}
        source={{ html }}
        style={styles.webview}
        onLoad={() => setReady(true)}
        onMessage={onMessage}
        scrollEnabled={false}
        bounces={false}
        javaScriptEnabled
        domStorageEnabled
        originWhitelist={["*"]}
        mixedContentMode="always"
        androidLayerType="hardware"
      />
      {/* React Native children (e.g. fixed center-pin overlay) */}
      {children}
    </View>
  );
});

export default OsmMapView;

const styles = StyleSheet.create({
  root: { overflow: "hidden" },
  webview: { flex: 1 },
});
