import React, { useEffect, useRef } from 'react';
import { LocationPin } from '../types';

declare const google: any; // Use Google Maps from global scope

interface MapViewProps {
  locations: LocationPin[];
  highlightedLocationId?: string | null;
  onMarkerClick?: (locationId: string) => void;
}

// This style object is now for your reference.
// To apply this style, create a Map ID in the Google Cloud Console,
// and import this JSON into the style editor for that Map ID.
const mapStyle = [
  // A beautiful dark theme with purple and cyan highlights
  { elementType: "geometry", stylers: [{ color: "#242f3e" }] },
  { elementType: "labels.text.stroke", stylers: [{ color: "#242f3e" }] },
  { elementType: "labels.text.fill", stylers: [{ color: "#746855" }] },
  {
    featureType: "administrative.locality",
    elementType: "labels.text.fill",
    stylers: [{ color: "#d59563" }],
  },
  {
    featureType: "poi",
    elementType: "labels.text.fill",
    stylers: [{ color: "#9ca3af" }], // gray-400
  },
    {
    featureType: "poi.park",
    elementType: "geometry",
    stylers: [{ color: "#263c3f" }],
  },
  {
    featureType: "poi.park",
    elementType: "labels.text.fill",
    stylers: [{ color: "#6b9a76" }],
  },
  {
    featureType: "road",
    elementType: "geometry",
    stylers: [{ color: "#38414e" }],
  },
  {
    featureType: "road",
    elementType: "geometry.stroke",
    stylers: [{ color: "#212a37" }],
  },
  {
    featureType: "road",
    elementType: "labels.text.fill",
    stylers: [{ color: "#9ca3af" }], // gray-400
  },
  {
    featureType: "road.highway",
    elementType: "geometry",
    stylers: [{ color: "#a855f7" }], // purple-500
  },
    {
    featureType: "road.highway",
    elementType: "geometry.stroke",
    stylers: [{ color: "#1e293b" }], // slate-800
  },
  {
    featureType: "road.highway",
    elementType: "labels.text.fill",
    stylers: [{ color: "#f3d19c" }],
  },
  {
    featureType: "transit",
    elementType: "geometry",
    stylers: [{ color: "#2f3948" }],
  },
  {
    featureType: "transit.station",
    elementType: "labels.text.fill",
    stylers: [{ color: "#d59563" }],
  },
  {
    featureType: "water",
    elementType: "geometry",
    stylers: [{ color: "#17263c" }],
  },
  {
    featureType: "water",
    elementType: "labels.text.fill",
    stylers: [{ color: "#515c6d" }],
  },
  {
    featureType: "water",
    elementType: "labels.text.stroke",
    stylers: [{ color: "#17263c" }],
  },
];


const MapView: React.FC<MapViewProps> = ({ locations, highlightedLocationId, onMarkerClick }) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<any>(null);
  const markersRef = useRef<any[]>([]);

  // Check if the Google Maps API script has loaded successfully.
  if (typeof google === 'undefined' || typeof google.maps === 'undefined') {
    return (
      <div className="w-full h-full min-h-[400px] lg:min-h-[70vh] rounded-xl bg-gray-800 border border-dashed border-red-700/50 flex flex-col items-center justify-center text-center p-4">
        <h3 className="text-xl font-bold text-red-300 mb-2">Map Unavailable</h3>
        <p className="text-gray-300 max-w-sm">
          The Google Maps API key is missing or invalid. Please add your key to the
          <code>&lt;script&gt;</code> tag in <code>index.html</code> to enable map functionality.
        </p>
      </div>
    );
  }

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

  useEffect(() => {
    const map = mapRef.current;
    if (!map || locations.length === 0) return;

    // Clear previous markers
    markersRef.current.forEach(marker => marker.setMap(null));
    markersRef.current = [];

    const bounds = new google.maps.LatLngBounds();
    const latLngs = locations.map(loc => {
        const latLng = new google.maps.LatLng(loc.coords.lat, loc.coords.lng);
        bounds.extend(latLng);
        return latLng;
    });

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
                fillColor: isHighlighted ? '#22d3ee' : '#a855f7', // cyan-400 or purple-500
                fillOpacity: 1,
                strokeWeight: 4,
                strokeColor: isHighlighted ? '#1f2937' : '#374151' // gray-800 or gray-700
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
      strokeColor: '#a855f7', // purple-500
      strokeOpacity: 0.7,
      strokeWeight: 3,
      icons: [{
          icon: {
            path: 'M 0,-1 0,1',
            strokeOpacity: 1,
            scale: 3,
            strokeColor: '#38414e'
          },
          offset: '0',
          repeat: '15px'
        }],
    });
    
    polyline.setMap(map);
    markersRef.current.push(polyline); // Store to clear later


    if (latLngs.length > 0) {
      map.fitBounds(bounds, 80); // 80px padding

      google.maps.event.addListenerOnce(map, 'idle', () => {
        const currentZoom = map.getZoom();
        const STATE_LEVEL_ZOOM = 9;
        if (currentZoom > STATE_LEVEL_ZOOM) {
          map.setZoom(STATE_LEVEL_ZOOM);
        }
      });
    }
  }, [locations, highlightedLocationId, onMarkerClick]);

  return <div ref={mapContainerRef} className="w-full h-full min-h-[400px] lg:min-h-[70vh] rounded-xl bg-gray-700" />;
};

export default MapView;