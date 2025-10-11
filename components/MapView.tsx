import React, { useEffect, useRef } from 'react';
import { LocationPin } from '../types';

declare const google: any; // Use Google Maps from global scope

interface MapViewProps {
  locations: LocationPin[];
  highlightedLocationId?: string | null;
  onMarkerClick?: (locationId: string) => void;
}

const mapStyle = [
    { elementType: "geometry", stylers: [{ color: "#1e293b" }] },
    { elementType: "labels.text.stroke", stylers: [{ color: "#0f172a" }] },
    { elementType: "labels.text.fill", stylers: [{ color: "#94a3b8" }] },
    { featureType: "administrative.locality", elementType: "labels.text.fill", stylers: [{ color: "#facc15" }] },
    { featureType: "poi", elementType: "labels.text.fill", stylers: [{ color: "#94a3b8" }] },
    { featureType: "poi.park", elementType: "geometry", stylers: [{ color: "#1e293b" }] },
    { featureType: "poi.park", elementType: "labels.text.fill", stylers: [{ color: "#5eead4" }] },
    { featureType: "road", elementType: "geometry", stylers: [{ color: "#334155" }] },
    { featureType: "road", elementType: "geometry.stroke", stylers: [{ color: "#1e293b" }] },
    { featureType: "road", elementType: "labels.text.fill", stylers: [{ color: "#94a3b8" }] },
    { featureType: "road.highway", elementType: "geometry", stylers: [{ color: "#eab308" }] },
    { featureType: "road.highway", elementType: "geometry.stroke", stylers: [{ color: "#0f172a" }] },
    { featureType: "transit", elementType: "geometry", stylers: [{ color: "#334155" }] },
    { featureType: "transit.station", elementType: "labels.text.fill", stylers: [{ color: "#facc15" }] },
    { featureType: "water", elementType: "geometry", stylers: [{ color: "#0f172a" }] },
    { featureType: "water", elementType: "labels.text.fill", stylers: [{ color: "#64748b" }] },
    { featureType: "water", elementType: "labels.text.stroke", stylers: [{ color: "#0f172a" }] },
];


const MapView: React.FC<MapViewProps> = ({ locations, highlightedLocationId, onMarkerClick }) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<any>(null);
  const markersRef = useRef<any[]>([]);

  // Check if the Google Maps API script has loaded successfully.
  if (typeof google === 'undefined' || typeof google.maps === 'undefined') {
    return (
      <div className="w-full h-full min-h-[400px] lg:min-h-[70vh] rounded-xl bg-slate-800 border border-dashed border-red-700/50 flex flex-col items-center justify-center text-center p-4">
        <h3 className="text-xl font-bold text-red-300 mb-2">Map Unavailable</h3>
        <p className="text-slate-300 max-w-sm">
          The Google Maps API key is missing or invalid. Please add your key to the
          <code>&lt;script&gt;</code> tag in <code>index.html</code> to enable map functionality.
        </p>
      </div>
    );
  }

  // Effect to initialize the map
  useEffect(() => {
    if (!mapContainerRef.current || mapRef.current) return;

    const map = new google.maps.Map(mapContainerRef.current, {
        center: { lat: 0, lng: 0 },
        zoom: 2,
        disableDefaultUI: true,
        styles: mapStyle,
        gestureHandling: 'cooperative'
    });
    mapRef.current = map;

  }, []);

  // Effect to draw/update markers and polyline when data or highlight changes
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    // Clear previous markers and polyline
    markersRef.current.forEach(item => item.setMap(null));
    markersRef.current = [];
    
    if (locations.length === 0) return;

    const latLngs = locations.map(loc => new google.maps.LatLng(loc.coords.lat, loc.coords.lng));

    locations.forEach((loc, index) => {
        const isHighlighted = loc.id === highlightedLocationId;

        const marker = new google.maps.Marker({
            position: { lat: loc.coords.lat, lng: loc.coords.lng },
            map,
            title: loc.name,
            label: {
                text: `${index + 1}`,
                color: 'white',
                fontWeight: 'bold',
            },
            icon: {
                path: google.maps.SymbolPath.CIRCLE,
                scale: isHighlighted ? 12 : 10,
                fillColor: isHighlighted ? '#22d3ee' : '#eab308', // cyan-400 or yellow-500
                fillOpacity: 1,
                strokeWeight: 4,
                strokeColor: isHighlighted ? '#0f172a' : '#1e293b' // slate-900 or slate-800
            },
            zIndex: isHighlighted ? 100 : 1,
        });

        if (onMarkerClick) {
            marker.addListener('click', () => {
                onMarkerClick(loc.id);
            });
        }

        markersRef.current.push(marker);
    });
    
    // Add polyline
    const polyline = new google.maps.Polyline({
      path: latLngs,
      geodesic: true,
      strokeColor: '#eab308', // yellow-500
      strokeOpacity: 0.7,
      strokeWeight: 3,
      icons: [{
          icon: {
            path: 'M 0,-1 0,1',
            strokeOpacity: 1,
            scale: 3,
            strokeColor: '#334155' // slate-700
          },
          offset: '0',
          repeat: '15px'
        }],
    });
    
    polyline.setMap(map);
    markersRef.current.push(polyline); // Store to clear later
  }, [locations, highlightedLocationId, onMarkerClick]);

  // Effect to fit map bounds only when locations change
  useEffect(() => {
    const map = mapRef.current;
    if (!map || locations.length === 0) return;

    const bounds = new google.maps.LatLngBounds();
    locations.forEach(loc => bounds.extend(new google.maps.LatLng(loc.coords.lat, loc.coords.lng)));
    
    map.fitBounds(bounds, 80); // 80px padding

    const listener = google.maps.event.addListenerOnce(map, 'idle', () => {
      const currentZoom = map.getZoom();
      const STATE_LEVEL_ZOOM = 9;
      if (currentZoom > STATE_LEVEL_ZOOM) {
        map.setZoom(STATE_LEVEL_ZOOM);
      }
    });

    // Cleanup listener on unmount or before re-running
    return () => {
      google.maps.event.removeListener(listener);
    }
    
  }, [locations]);

  return <div ref={mapContainerRef} className="w-full h-full min-h-[400px] lg:min-h-[70vh] rounded-xl bg-slate-700" />;
};

export default MapView;
