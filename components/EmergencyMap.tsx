/**
 * KWIK Emergency Map Component
 * Interactive map displaying emergency call locations with Leaflet
 */

'use client';

import { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { EmergencyCall } from '@/lib/types';
import { getSeverityColor, getEmotionEmoji, getTimeElapsed } from '@/lib/mock-data';

// Fix Leaflet default marker icon issue in Next.js
import icon from 'leaflet/dist/images/marker-icon.png';
import iconShadow from 'leaflet/dist/images/marker-shadow.png';

let DefaultIcon = L.icon({
  iconUrl: icon.src,
  shadowUrl: iconShadow.src,
  iconSize: [25, 41],
  iconAnchor: [12, 41],
});

L.Marker.prototype.options.icon = DefaultIcon;

interface EmergencyMapProps {
  calls: EmergencyCall[];
  selectedCallId: string | null;
  onMarkerClick: (callId: string) => void;
}

export default function EmergencyMap({ calls, selectedCallId, onMarkerClick }: EmergencyMapProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<L.Map | null>(null);
  const markersRef = useRef<Map<string, L.Marker>>(new Map());
  const popupsRef = useRef<Map<string, L.Popup>>(new Map());
  const [mapCenter, setMapCenter] = useState<[number, number]>([37.7749, -122.4194]);

  // Initialize map once
  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;
    
    // Clean up any existing map instance
    const cleanupMap = () => {
      if (mapRef.current) {
        mapRef.current.off();
        mapRef.current.remove();
        mapRef.current = null;
      }
    };

    // Wait for the container to be fully rendered
    const initMap = setTimeout(() => {
      try {
        const map = L.map(containerRef.current as HTMLElement, {
          center: mapCenter,
          zoom: 13,
          zoomControl: true,
          attributionControl: false,
          preferCanvas: true, // Better performance with many markers
        });

        // Add the OpenStreetMap tile layer
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
          maxZoom: 19,
          attribution: '© OpenStreetMap contributors',
          detectRetina: true,
        }).addTo(map);

        // Force a resize to ensure the map renders correctly
        const resizeTimer = setTimeout(() => {
          map.invalidateSize();
          // Recenter the map after resize
          map.setView(mapCenter, 13);
        }, 100);

        mapRef.current = map;

        // Cleanup function
        return () => {
          clearTimeout(initMap);
          clearTimeout(resizeTimer);
          cleanupMap();
        };
      } catch (error) {
        console.error('Error initializing map:', error);
      }
    }, 100);

    return cleanupMap;

  }, []);


  // Update markers when calls change
  useEffect(() => {
    if (!mapRef.current) return;

    const currentMarkers = new Set<string>();

    calls.forEach((call) => {
      const location = call.caller_location;
      if (!location || !location.latitude || !location.longitude) return;

      currentMarkers.add(call.id);

      // Create custom marker based on severity
      const markerColor = getSeverityMarkerColor(call.severity);
      const customIcon = createCustomMarkerIcon(markerColor, call.incident_type);

      let marker = markersRef.current.get(call.id);
      if (!marker) {
        marker = L.marker([location.latitude, location.longitude], {
          icon: customIcon,
        }).addTo(mapRef.current!);

        // Add click handler
        marker.on('click', () => {
          onMarkerClick(call.id);
        });

        markersRef.current.set(call.id, marker);
      } else {
        marker.setLatLng([location.latitude, location.longitude]);
        marker.setIcon(customIcon);
      }

      // Create popup content
      const popupContent = createPopupContent(call);
      let popup = popupsRef.current.get(call.id);
      if (!popup) {
        popup = L.popup({
          maxWidth: 350,
          closeButton: true,
          className: 'emergency-popup',
        }).setContent(popupContent);
        marker.bindPopup(popup);
        popupsRef.current.set(call.id, popup);
      } else {
        popup.setContent(popupContent);
      }

      // Open popup if selected
      if (selectedCallId === call.id && marker) {
        marker.openPopup();
        mapRef.current!.setView([location.latitude, location.longitude], 15);
      }
    });

    // Remove markers for calls no longer in the list
    markersRef.current.forEach((marker, id) => {
      if (!currentMarkers.has(id)) {
        marker.remove();
        markersRef.current.delete(id);
        popupsRef.current.delete(id);
      }
    });

  }, [calls, selectedCallId, onMarkerClick]);

  return (
    <div className="relative h-full w-full">
      <div 
        ref={containerRef} 
        className="h-full w-full z-0"
        style={{
          minHeight: '500px',
          backgroundColor: '#1a1a1a'
        }}
      ></div>
      
      {/* Map Legend */}
      <div className="absolute bottom-6 right-6 bg-gray-900/95 backdrop-blur rounded-lg shadow-xl p-4 z-[1000] border border-gray-700">
        <h4 className="text-sm font-semibold mb-3 text-white">Legend</h4>
        <div className="space-y-2 text-xs">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 bg-red-500 rounded-full"></div>
            <span className="text-gray-300">Critical</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 bg-orange-500 rounded-full"></div>
            <span className="text-gray-300">High Priority</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 bg-yellow-500 rounded-full"></div>
            <span className="text-gray-300">Medium Priority</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 bg-green-500 rounded-full"></div>
            <span className="text-gray-300">Low Priority</span>
          </div>
        </div>
      </div>

      {/* Map Controls Info */}
      <div className="absolute top-6 right-6 bg-gray-900/95 backdrop-blur rounded-lg shadow-xl px-4 py-2 z-[1000] border border-gray-700">
        <div className="text-xs text-gray-300">
          <span className="font-semibold text-white">{calls.length}</span> active emergency calls
        </div>
      </div>

      {/* Custom CSS for popup styling */}
      <style jsx global>{`
        .emergency-popup .leaflet-popup-content-wrapper {
          background: #1f2937;
          color: white;
          border-radius: 8px;
          padding: 0;
          box-shadow: 0 10px 25px rgba(0, 0, 0, 0.5);
        }
        .emergency-popup .leaflet-popup-content {
          margin: 0;
          min-width: 280px;
        }
        .emergency-popup .leaflet-popup-tip {
          background: #1f2937;
        }
        .emergency-popup a.leaflet-popup-close-button {
          color: #9ca3af;
        }
        .emergency-popup a.leaflet-popup-close-button:hover {
          color: white;
        }
      `}</style>
    </div>
  );
}
/**
 * Get marker color based on severity
 */
function getSeverityMarkerColor(severity?: string): string {
  switch (severity) {
    case 'critical':
      return '#ef4444'; // red-500
    case 'high':
      return '#f97316'; // orange-500
    case 'medium':
      return '#eab308'; // yellow-500
    case 'low':
      return '#22c55e'; // green-500
    default:
      return '#6b7280'; // gray-500
  }
}

/**
 * Create custom marker icon with severity color
 */
function createCustomMarkerIcon(color: string, incidentType?: string): L.DivIcon {
  const icon = getIncidentIcon(incidentType);
  
  return L.divIcon({
    className: 'custom-marker',
    html: `
      <div style="position: relative;">
        <div style="
          width: 40px;
          height: 40px;
          background: ${color};
          border: 3px solid white;
          border-radius: 50%;
          box-shadow: 0 4px 8px rgba(0,0,0,0.3), 0 0 0 4px ${color}33;
          display: flex;
          align-items: center;
          justify-center: center;
          font-size: 20px;
          animation: pulse 2s infinite;
        ">
          ${icon}
        </div>
        <div style="
          position: absolute;
          bottom: -4px;
          left: 50%;
          transform: translateX(-50%);
          width: 8px;
          height: 8px;
          background: ${color};
          border: 2px solid white;
          border-radius: 50%;
          box-shadow: 0 2px 4px rgba(0,0,0,0.2);
        "></div>
      </div>
      <style>
        @keyframes pulse {
          0% { transform: scale(1); opacity: 1; }
          50% { transform: scale(1.05); opacity: 0.8; }
          100% { transform: scale(1); opacity: 1; }
        }
      </style>
    `,
    iconSize: [40, 48],
    iconAnchor: [20, 48],
    popupAnchor: [0, -48],
  });
}
/**
 * Get icon emoji for incident type
 */
function getIncidentIcon(incidentType?: string): string {
  switch (incidentType) {
    case 'fire':
      return '🔥';
    case 'medical_emergency':
      return '🚑';
    case 'accident':
      return '🚗';
    case 'crime':
      return '🚨';
    case 'public_safety':
      return '⚠️';
    default:
      return '📍';
  }
}

/**
 * Create HTML content for map popup
 */
function createPopupContent(call: EmergencyCall): string {
  const severityBadge = `
    <span style="
      background: ${getSeverityMarkerColor(call.severity)};
      color: white;
      padding: 2px 8px;
      border-radius: 4px;
      font-size: 10px;
      font-weight: bold;
      text-transform: uppercase;
    ">
      ${call.severity || 'unknown'}
    </span>
  `;

  const liveBadge = call.status === 'active' ? `
    <span style="
      border: 1px solid #22c55e;
      color: #22c55e;
      padding: 2px 8px;
      border-radius: 4px;
      font-size: 10px;
      font-weight: bold;
      animation: pulse 2s infinite;
    ">
      LIVE
    </span>
  ` : '';

  return `
    <div style="padding: 16px;">
      <!-- Header -->
      <div style="display: flex; justify-content: space-between; align-items: start; margin-bottom: 12px;">
        <div>
          ${severityBadge}
        </div>
        ${liveBadge}
      </div>

      <!-- Title -->
      <h3 style="font-size: 14px; font-weight: 600; margin: 0 0 12px 0; color: white;">
        ${call.incident_subtype || call.incident_type || 'Emergency Call'}
      </h3>

      <!-- Details -->
      <div style="font-size: 12px; color: #d1d5db; line-height: 1.8;">
        <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 6px;">
          <span>📍</span>
          <span>${call.caller_location?.address || 'Location unknown'}</span>
        </div>
        <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 6px;">
          <span>🕐</span>
          <span>Active for ${getTimeElapsed(call.created_at)}</span>
        </div>
        <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 6px;">
          <span>📞</span>
          <span>+1-***-***-${call.caller_number.slice(-4)}</span>
        </div>
        ${
          call.top_emotion
            ? `
        <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 6px;">
          <span>${getEmotionEmoji(call.top_emotion)}</span>
          <span>${call.top_emotion} (${Math.round((call.emotion_intensity || 0) * 100)}%)</span>
        </div>
        `
            : ''
        }
      </div>

      <!-- AI Summary -->
      ${
        call.ai_summary
          ? `
      <div style="
        margin-top: 12px;
        padding: 8px;
        background: #374151;
        border-radius: 6px;
        font-size: 11px;
        color: #e5e7eb;
        line-height: 1.5;
      ">
        ${call.ai_summary}
      </div>
      `
          : ''
      }

      <!-- Action Buttons -->
      <div style="display: flex; gap: 8px; margin-top: 12px;">
        <a href="/dashboard/calls/${call.id}" style="
          flex: 1;
          background: #3b82f6;
          color: white;
          padding: 8px;
          border-radius: 6px;
          text-align: center;
          text-decoration: none;
          font-size: 12px;
          font-weight: 500;
        ">
          View Details →
        </a>
      </div>
    </div>
  `;
}



