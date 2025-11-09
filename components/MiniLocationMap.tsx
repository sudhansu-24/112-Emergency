/**
 * @file MiniLocationMap.tsx
 * @description Compact Leaflet map used inside the call detail sidebar to provide a live street-level reference.
 */

'use client';

import { useEffect, useRef, useState } from 'react';
import type { Map as LeafletMap, Marker as LeafletMarker } from 'leaflet';

interface MiniLocationMapProps {
  latitude?: number;
  longitude?: number;
  label?: string;
  className?: string;
}

/**
 * @description Renders a non-interactive Leaflet instance centred on the caller coordinates. Keeps a single marker refreshed when the selection changes.
 */
// Cache the dynamic Leaflet import so multiple component instances reuse the same promise.
let leafletModulePromise: Promise<typeof import('leaflet')> | null = null;

function loadLeaflet() {
  if (!leafletModulePromise) {
    leafletModulePromise = import('leaflet');
  }
  return leafletModulePromise;
}

function ensureLeafletStyles() {
  if (typeof window === 'undefined') {
    return;
  }
  if (document.getElementById('leaflet-mini-stylesheet')) {
    return;
  }
  const link = document.createElement('link');
  link.id = 'leaflet-mini-stylesheet';
  link.rel = 'stylesheet';
  link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
  link.crossOrigin = '';
  document.head.appendChild(link);
}

export default function MiniLocationMap({
  latitude,
  longitude,
  label,
  className,
}: MiniLocationMapProps) {
  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<LeafletMap | null>(null);
  const markerRef = useRef<LeafletMarker | null>(null);
  const [leaflet, setLeaflet] = useState<typeof import('leaflet') | null>(null);

  /**
   * @description Lazily load Leaflet on the client, preventing SSR from touching the `window` object.
   */
  useEffect(() => {
    if (leaflet || typeof window === 'undefined') {
      return;
    }

    let cancelled = false;

    loadLeaflet()
      .then((module) => {
        if (cancelled) {
          return;
        }
        ensureLeafletStyles();
        const resolved = module as typeof import('leaflet');
        setLeaflet(resolved);
      })
      .catch((error) => {
        console.error('Failed to load Leaflet for MiniLocationMap:', error);
      });

    return () => {
      cancelled = true;
    };
  }, [leaflet]);

  /**
   * @description Creates the Leaflet map once coordinates and container are available. Disables user gestures because this widget is purely informational.
   */
  useEffect(() => {
    if (
      !mapContainerRef.current ||
      mapRef.current ||
      latitude === undefined ||
      longitude === undefined ||
      !leaflet
    ) {
      return;
    }

    const L = leaflet;

    const map = L.map(mapContainerRef.current, {
      center: [latitude, longitude],
      zoom: 17,
      zoomControl: false,
      attributionControl: false,
    });

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution: '© OpenStreetMap contributors',
    }).addTo(map);

    // Disable user interactions to keep this widget as a static contextual preview.
    map.dragging.disable();
    map.doubleClickZoom.disable();
    map.scrollWheelZoom.disable();
    map.boxZoom.disable();
    map.keyboard.disable();
    if ((map as any).touchZoom) {
      map.touchZoom.disable();
    }

    const icon = L.divIcon({
      className: 'mini-map-marker',
      html: '<div class="mini-map-marker-dot"></div>',
      iconSize: [20, 20],
      iconAnchor: [10, 10],
    });

    markerRef.current = L.marker([latitude, longitude], { icon }).addTo(map);

    if (label) {
      markerRef.current.bindTooltip(label, {
        direction: 'top',
        offset: L.point(0, -12),
        opacity: 0.9,
      });
    }

    mapRef.current = map;

    // Slight delay ensures the tiles are measured correctly inside the sidebar layout.
    setTimeout(() => {
      map.invalidateSize();
    }, 50);

    return () => {
      map.remove();
      mapRef.current = null;
      markerRef.current = null;
    };
  }, [latitude, longitude, leaflet]);

  /**
   * @description Keeps the existing map centred and marker updated when a new incident is selected.
   */
  useEffect(() => {
    if (!mapRef.current || latitude === undefined || longitude === undefined || !leaflet) {
      return;
    }

    const L = leaflet;

    mapRef.current.setView([latitude, longitude], 17);

    if (markerRef.current) {
      markerRef.current.setLatLng([latitude, longitude]);
    } else {
      const icon = L.divIcon({
        className: 'mini-map-marker',
        html: '<div class="mini-map-marker-dot"></div>',
        iconSize: [20, 20],
        iconAnchor: [10, 10],
      });
      markerRef.current = L.marker([latitude, longitude], { icon }).addTo(mapRef.current);
    }
  }, [latitude, longitude, leaflet]);

  /**
   * @description Clears the map if the caller location goes missing to avoid showing stale coordinates.
   */
  useEffect(() => {
    if (latitude !== undefined && longitude !== undefined) {
      return;
    }

    if (mapRef.current) {
      mapRef.current.remove();
      mapRef.current = null;
      markerRef.current = null;
    }
  }, [latitude, longitude]);

  return (
    <>
      <div ref={mapContainerRef} className={className ?? 'h-full w-full'} />
      <style jsx global>{`
        .mini-map-marker {
          background: transparent;
          border: none;
        }
        .mini-map-marker-dot {
          width: 18px;
          height: 18px;
          border-radius: 9999px;
          background: radial-gradient(circle at center, #f87171 0%, #dc2626 70%, rgba(220, 38, 38, 0) 100%);
          border: 2px solid rgba(255, 255, 255, 0.85);
          box-shadow: 0 0 10px rgba(220, 38, 38, 0.55);
        }
      `}</style>
    </>
  );
}

