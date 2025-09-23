import React, { useEffect, useRef } from 'react';
import { LocationPin } from '../types';

declare const google: any; // Use Google Maps from global scope

interface MapViewProps {
  locations: LocationPin[];
  highlightedLocationId?: string | null;
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


const MapView: React.FC<MapViewProps> = ({ locations, highlightedLocationId }) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<any>(null);
  const markersRef = useRef<any[]>([]);

  useEffect(() => {
    if (!mapContainerRef.current || mapRef.current) return;

    const map = new google.maps.Map(mapContainerRef.current, {
        // IMPORTANT: Advanced Markers require a Map ID.
        // Create a Map ID in your Google Cloud Console and paste it here.
        mapId: 'YOUR_MAP_ID_HERE', 
        center: { lat: 0, lng: 0 },
        zoom: 2,
        disableDefaultUI: true,
        // The 'styles' property is ignored when a mapId is used.
        // Styling must be configured in the Google Cloud Console for the Map ID.
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

        const markerElement = document.createElement('div');
        markerElement.className = `custom-pin flex items-center justify-center text-white font-bold text-sm ring-4 shadow-lg rounded-full transition-all duration-300 ${isHighlighted ? 'w-8 h-8 bg-cyan-400 ring-gray-900 scale-125' : 'w-6 h-6 bg-purple-600 ring-gray-800'}`;
        markerElement.textContent = `${index + 1}`;
        
        const marker = new google.maps.marker.AdvancedMarkerElement({
            position: { lat: loc.coords.lat, lng: loc.coords.lng },
            map,
            title: loc.name,
            content: markerElement,
        });

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

      // Add a one-time listener to ensure the zoom level is not too close,
      // providing a state-level overview.
      google.maps.event.addListenerOnce(map, 'idle', () => {
        const currentZoom = map.getZoom();
        const STATE_LEVEL_ZOOM = 9; // Approx. zoom for viewing a state
        if (currentZoom > STATE_LEVEL_ZOOM) {
          map.setZoom(STATE_LEVEL_ZOOM);
        }
      });
    }
  }, [locations, highlightedLocationId]);

  return <div ref={mapContainerRef} className="w-full h-full min-h-[400px] lg:min-h-[70vh] rounded-xl bg-gray-700" />;
};

export default MapView;