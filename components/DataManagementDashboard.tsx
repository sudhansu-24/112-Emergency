/**
 * Data Management Dashboard
 * Analytics, heatmaps, forecasts, and historical data visualization
 */

'use client';

import { useState, useMemo, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  X,
  Download,
  Calendar as CalendarIcon,
  ChevronLeft,
  ChevronRight,
  BarChart3,
  TrendingUp,
  AlertTriangle,
  Clock,
  Users,
  Phone,
  BarChart,
  Database,
} from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

interface DataManagementDashboardProps {
  open: boolean;
  onClose: () => void;
}

type ViewMode = 'actual' | 'forecast';
type TimePeriod = 'morning' | 'night';

// Mock data generator based on time period
const generateMockData = (period: TimePeriod, view: ViewMode, month: number, year: number) => {
  const isForecast = view === 'forecast';
  const isMorning = period === 'morning';
  
  const baseMultiplier = isMorning ? 1.2 : 0.9;
  const forecastMultiplier = isForecast ? 1.15 : 1.0;
  const monthFactor = month / 12;
  
  return {
    totalCalls: Math.floor((isMorning ? 146 : 134) * forecastMultiplier + monthFactor * 20),
    resolutionRate: (isMorning ? 99.7 : 99.3) * (isForecast ? 0.98 : 1),
    totalWaitTime: `${isMorning ? 31 : 31}:${isMorning ? 21 : 61} min`,
    avgWaitTime: `${isMorning ? 7 : 4} sec`,
  };
};

export default function DataManagementDashboard({ open, onClose }: DataManagementDashboardProps) {
  const [viewMode, setViewMode] = useState<ViewMode>('actual');
  const [timePeriod, setTimePeriod] = useState<TimePeriod>('morning');
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [showCalendar, setShowCalendar] = useState(false);

  const data = useMemo(
    () => generateMockData(timePeriod, viewMode, selectedDate.getMonth(), selectedDate.getFullYear()),
    [timePeriod, viewMode, selectedDate]
  );

  const formatDate = (date: Date) => {
    return date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
  };

  const changeMonth = (delta: number) => {
    const newDate = new Date(selectedDate);
    newDate.setMonth(newDate.getMonth() + delta);
    
    // Don't allow future dates
    if (newDate > new Date()) return;
    
    setSelectedDate(newDate);
  };

  const CalendarPicker = () => {
    const today = new Date();
    const year = selectedDate.getFullYear();
    const month = selectedDate.getMonth();
    
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const firstDay = new Date(year, month, 1).getDay();
    
    const days = [];
    for (let i = 0; i < firstDay; i++) {
      days.push(<div key={`empty-${i}`} className="h-8" />);
    }
    
    for (let day = 1; day <= daysInMonth; day++) {
      const date = new Date(year, month, day);
      const isFuture = date > today;
      const isSelected = date.toDateString() === selectedDate.toDateString();
      const isToday = date.toDateString() === today.toDateString();
      
      days.push(
        <button
          key={day}
          onClick={() => {
            if (!isFuture) {
              setSelectedDate(date);
              setShowCalendar(false);
            }
          }}
          disabled={isFuture}
          className={`h-8 w-8 rounded text-sm ${
            isSelected
              ? 'bg-blue-600 text-white'
              : isToday
              ? 'bg-blue-500/20 text-blue-400'
              : isFuture
              ? 'text-gray-600 cursor-not-allowed'
              : 'hover:bg-gray-700 text-gray-300'
          }`}
        >
          {day}
        </button>
      );
    }
    
    return (
      <div className="absolute top-12 right-0 z-50 bg-gray-900 border border-gray-700 rounded-lg shadow-xl p-4 w-72">
        <div className="flex items-center justify-between mb-4">
          <button
            onClick={() => {
              const newDate = new Date(selectedDate);
              newDate.setMonth(newDate.getMonth() - 1);
              setSelectedDate(newDate);
            }}
            className="p-1 hover:bg-gray-800 rounded"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <div className="font-semibold">
            {selectedDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
          </div>
          <button
            onClick={() => {
              const newDate = new Date(selectedDate);
              newDate.setMonth(newDate.getMonth() + 1);
              if (newDate <= today) setSelectedDate(newDate);
            }}
            disabled={new Date(year, month + 1, 1) > today}
            className="p-1 hover:bg-gray-800 rounded disabled:opacity-30 disabled:cursor-not-allowed"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
        
        <div className="grid grid-cols-7 gap-1 mb-2">
          {['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map((day) => (
            <div key={day} className="text-xs text-gray-500 text-center font-semibold">
              {day}
            </div>
          ))}
        </div>
        
        <div className="grid grid-cols-7 gap-1">{days}</div>
      </div>
    );
  };

  if (!open) return null;

  return (
    <div className="fixed inset-y-0 left-14 right-0 z-[2000] bg-gray-950 text-gray-100 flex flex-col">
      {/* Header */}
      <header className="bg-gray-900 border-b border-gray-800 px-6 py-3 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Database className="w-5 h-5 text-blue-500" />
          <h1 className="text-lg font-bold uppercase">Data Management</h1>
        </div>
        
        <div className="flex items-center gap-4">
          {/* View Mode Tabs */}
          <div className="flex items-center gap-2 bg-gray-800 rounded-lg p-1">
            <button
              onClick={() => setViewMode('actual')}
              className={`px-4 py-1.5 rounded text-sm font-medium transition-colors ${
                viewMode === 'actual'
                  ? 'bg-blue-600 text-white'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              Actual
            </button>
            <button
              onClick={() => setViewMode('forecast')}
              className={`px-4 py-1.5 rounded text-sm font-medium transition-colors ${
                viewMode === 'forecast'
                  ? 'bg-blue-600 text-white'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              Forecast
            </button>
          </div>
          
          <Button variant="ghost" size="sm" onClick={onClose}>
            <X className="w-5 h-5" />
          </Button>
        </div>
      </header>

      <div className="flex-1 overflow-y-auto">
        <div className="p-6 space-y-6">
          {/* Forecast Banner */}
          {viewMode === 'forecast' && (
            <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-3 text-sm">
              Note: all information here are forecasted from{' '}
              <span className="text-blue-400 underline cursor-pointer">previous calls</span>. These are not real
              metrics.
            </div>
          )}

          {/* Top Controls */}
          <div className="flex items-center justify-between">
            <div className="text-sm font-semibold uppercase text-gray-400">
              {viewMode === 'actual' ? 'RAW DATA' : 'FORECAST DATA'}
            </div>
            
            <div className="flex items-center gap-3">
              {/* Month Navigator */}
              <div className="flex items-center gap-2 bg-gray-900 rounded-lg px-2 py-1 border border-gray-800">
                <button
                  onClick={() => changeMonth(-1)}
                  className="p-1 hover:bg-gray-800 rounded transition-colors"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setShowCalendar((prev) => !prev)}
                  className="px-3 py-1 hover:bg-gray-800 rounded transition-colors flex items-center gap-2 relative"
                >
                  <CalendarIcon className="w-4 h-4" />
                  <span className="text-sm font-medium">{formatDate(selectedDate).toUpperCase()}</span>
                  {showCalendar && <CalendarPicker />}
                </button>
                <button
                  onClick={() => changeMonth(1)}
                  disabled={new Date(selectedDate.getFullYear(), selectedDate.getMonth() + 1, 1) > new Date()}
                  className="p-1 hover:bg-gray-800 rounded transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
              
              {/* Time Period Selector */}
              <Select value={timePeriod} onValueChange={(value: TimePeriod) => setTimePeriod(value)}>
                <SelectTrigger className="w-32 bg-gray-900 border-gray-800">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="z-[9999]">
                  <SelectItem value="morning">MORNING</SelectItem>
                  <SelectItem value="night">NIGHT</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Metrics Cards */}
          <div className="grid grid-cols-4 gap-4">
            <MetricCard
              label="Total calls received"
              value={data.totalCalls.toString()}
              status={viewMode === 'forecast' ? 'critical' : 'normal'}
              icon={<Phone className="w-4 h-4" />}
            />
            <MetricCard
              label="Resolution Rate"
              value={`${data.resolutionRate.toFixed(1)}%`}
              status="normal"
              icon={<TrendingUp className="w-4 h-4" />}
            />
            <MetricCard
              label="Total wait time"
              value={data.totalWaitTime}
              status="normal"
              icon={<Clock className="w-4 h-4" />}
            />
            <MetricCard
              label="Average wait time"
              value={data.avgWaitTime}
              status="excessive"
              icon={<Clock className="w-4 h-4" />}
            />
          </div>

          {/* Communication Status */}
          <div className="bg-gray-900 border border-gray-800 rounded-lg p-4">
            <h3 className="text-sm font-semibold mb-3">Communication status</h3>
            <div className="grid grid-cols-3 gap-4">
              <CommStatus label="Radio tower 2" location="North" status="active" />
              <CommStatus label="Radio tower 2" location="North" status="active" />
              <CommStatus label="Radio tower 2" location="North" status="active" />
            </div>
          </div>

          {/* Main Content Grid */}
          <div className="grid grid-cols-2 gap-6">
            {/* Left Column - Charts */}
            <div className="space-y-6">
              <ChartCard
                title="Calls over time"
                timePeriod={timePeriod}
                viewMode={viewMode}
              />
              <ChartCard
                title="Type of Calls"
                type="bar"
                timePeriod={timePeriod}
                viewMode={viewMode}
              />
            </div>

            {/* Right Column - Map & Dispatcher List */}
            <div className="space-y-6">
              <MapCard timePeriod={timePeriod} />
              <DispatcherListCard timePeriod={timePeriod} />
            </div>
          </div>

          {/* Recommendations (Forecast only) */}
          {viewMode === 'forecast' && (
            <div className="grid grid-cols-2 gap-6">
              <RecommendationCard
                icon={<AlertTriangle className="w-4 h-4 text-orange-400" />}
                title="Recommendation"
                text="Due to the projected increase in wait times from understaffing, we recommend beginning recruitment for new dispatchers and increase training within the next month."
              />
              <RecommendationCard
                icon={<AlertTriangle className="w-4 h-4 text-orange-400" />}
                title="Recommendation"
                text="Due to active rainstorms within the next 2 months, we recommend implementing backup power to mitigate radio tower disconnections."
              />
              <RecommendationCard
                icon={<AlertTriangle className="w-4 h-4 text-orange-400" />}
                title="Recommendation"
                text="Due to the projected increase in critical calls, it is recommended to reduce personnel on nonemergency lines such as 912."
              />
              <RecommendationCard
                icon={<AlertTriangle className="w-4 h-4 text-orange-400" />}
                title="Recommendation"
                text="Washington has been experiencing significant civil unrest in the past month. In addition, violent crimes have been increasing. We recommend increasing police presence in this area."
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// SUB-COMPONENTS
// ============================================================================

interface MetricCardProps {
  label: string;
  value: string;
  status: 'normal' | 'excessive' | 'critical';
  icon: React.ReactNode;
}

function MetricCard({ label, value, status, icon }: MetricCardProps) {
  const statusColors = {
    normal: 'text-green-400 border-green-500/30 bg-green-500/10',
    excessive: 'text-orange-400 border-orange-500/30 bg-orange-500/10',
    critical: 'text-red-400 border-red-500/30 bg-red-500/10',
  };

  return (
    <div className={`border rounded-lg p-4 ${statusColors[status]}`}>
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs uppercase font-semibold">{status}</span>
        {icon}
      </div>
      <div className="text-sm text-gray-400 mb-1">{label}</div>
      <div className="text-3xl font-bold">{value}</div>
    </div>
  );
}

function CommStatus({ label, location, status }: { label: string; location: string; status: string }) {
  return (
    <div className="bg-gray-800 rounded-lg p-3 border border-gray-700">
      <div className="flex items-center gap-2 mb-2">
        <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
        <span className="text-xs uppercase font-semibold text-gray-400">Normal</span>
      </div>
      <div className="font-semibold mb-1">{label}</div>
      <div className="text-xs text-gray-500">Location: {location}</div>
      <div className="mt-2 flex items-center gap-1 text-green-400 text-sm font-semibold">
        <div className="w-2 h-2 bg-green-500 rounded-full" />
        {status.toUpperCase()}
      </div>
    </div>
  );
}

function ChartCard({
  title,
  type = 'line',
  timePeriod,
  viewMode,
}: {
  title: string;
  type?: 'line' | 'bar';
  timePeriod: TimePeriod;
  viewMode: ViewMode;
}) {
  return (
    <div className="bg-gray-900 border border-gray-800 rounded-lg p-4">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <BarChart3 className="w-4 h-4 text-blue-400" />
          <h3 className="text-sm font-semibold">{title}</h3>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" className="h-7 w-7 p-0">
            <Download className="w-3 h-3" />
          </Button>
          <Select defaultValue={timePeriod}>
            <SelectTrigger className="w-28 h-7 text-xs bg-gray-800 border-gray-700">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="z-[9999]">
              <SelectItem value="morning">MORNING</SelectItem>
              <SelectItem value="night">NIGHT</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Chart Placeholder */}
      <div className="h-64 bg-gray-800/50 rounded flex items-center justify-center relative">
        {type === 'line' ? (
          <svg className="w-full h-full" viewBox="0 0 400 200">
            {/* Grid lines */}
            {[0, 1, 2, 3, 4, 5].map((i) => (
              <line
                key={i}
                x1="0"
                y1={i * 40}
                x2="400"
                y2={i * 40}
                stroke="#374151"
                strokeWidth="1"
                opacity="0.3"
              />
            ))}
            {/* Line charts */}
            <polyline
              points="0,180 50,160 100,140 150,130 200,120 250,110 300,95 350,80 400,70"
              fill="none"
              stroke="#ef4444"
              strokeWidth="2"
            />
            <polyline
              points="0,190 50,175 100,165 150,155 200,145 250,135 300,125 350,115 400,105"
              fill="none"
              stroke="#eab308"
              strokeWidth="2"
            />
            <polyline
              points="0,195 50,185 100,180 150,175 200,170 250,165 300,160 350,155 400,150"
              fill="none"
              stroke="#22c55e"
              strokeWidth="2"
            />
          </svg>
        ) : (
          <svg className="w-full h-full" viewBox="0 0 400 200">
            {/* Bar chart groups */}
            {[0, 1, 2, 3, 4, 5].map((i) => (
              <g key={i} transform={`translate(${i * 60 + 20}, 0)`}>
                <rect x="0" y="50" width="12" height="150" fill="#22c55e" opacity="0.8" />
                <rect x="14" y="70" width="12" height="130" fill="#3b82f6" opacity="0.8" />
                <rect x="28" y="90" width="12" height="110" fill="#eab308" opacity="0.8" />
              </g>
            ))}
          </svg>
        )}
        
        {/* Legend */}
        <div className="absolute bottom-2 left-2 flex items-center gap-4 text-xs">
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 bg-red-500 rounded-full" />
            <span>Critical</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 bg-yellow-500 rounded-full" />
            <span>{type === 'line' ? 'Mild' : '912'}</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 bg-green-500 rounded-full" />
            <span>{type === 'line' ? 'Safe' : '911'}</span>
          </div>
        </div>
      </div>
    </div>
  );
}

function MapCard({ timePeriod }: { timePeriod: TimePeriod }) {
  const mapRef = useRef<any>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const heatLayerRef = useRef<any>(null);

  useEffect(() => {
    if (typeof window === 'undefined' || !containerRef.current) return;

    // Dynamic imports for client-side only
    const initMap = async () => {
      const leafletModule = await import('leaflet');
      const L = leafletModule.default ?? leafletModule;
      await import('leaflet.heat');

      // Clean up existing map
      if (mapRef.current) {
        mapRef.current.remove();
      }

      // Initialize map
      const map = L.map(containerRef.current!, {
        center: [28.7041, 77.1025],
        zoom: 12,
        zoomControl: false,
        attributionControl: false,
        preferCanvas: true,
      });

      // Add dark tile layer - using CartoDB Dark Matter (100% free, no API key)
      L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
        maxZoom: 19,
        attribution: '',
        subdomains: 'abcd'
      }).addTo(map);
      
      // Alternative ultra-dark option (if you want pitch black background):
      // L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_nolabels/{z}/{x}/{y}{r}.png', { ... })
      // 
      // Or Stadia Maps (requires free account for production):
      // L.tileLayer('https://tiles.stadiamaps.com/tiles/alidade_smooth_dark/{z}/{x}/{y}{r}.png', { ... })

      // Generate realistic emergency call heatmap data around North-West Delhi (Rohini & neighboring sectors)
      const heatData: [number, number, number][] = [];
      
      // High-density zones across Rohini, Pitampura, Shalimar Bagh, etc.
      const hotspots = [
        { lat: 28.7196, lng: 77.1186, count: 18 }, // Rohini Sector 16
        { lat: 28.7049, lng: 77.1324, count: 16 }, // Pitampura Metro Corridor
        { lat: 28.7340, lng: 77.1045, count: 14 }, // Rithala Depot / Metro
        { lat: 28.7135, lng: 77.0998, count: 12 }, // Swarn Jayanti Park
        { lat: 28.7015, lng: 77.1500, count: 10 }, // Shalimar Bagh
        { lat: 28.6898, lng: 77.1400, count: 9 },  // Ashok Vihar border
        { lat: 28.7235, lng: 77.0842, count: 11 }, // Sector 24 Rohini markets
        { lat: 28.7420, lng: 77.1235, count: 8 },  // Budh Vihar / Pooth Kalan
      ];

      hotspots.forEach(spot => {
        for (let i = 0; i < spot.count; i++) {
          // Add random scatter around hotspot
          const lat = spot.lat + (Math.random() - 0.5) * 0.015;
          const lng = spot.lng + (Math.random() - 0.5) * 0.015;
          const intensity = 0.5 + Math.random() * 0.5; // 0.5 to 1.0
          heatData.push([lat, lng, intensity]);
        }
      });

      // Add random scattered calls across Northwest Delhi to keep the heatmap alive
      for (let i = 0; i < 50; i++) {
        const lat = 28.7041 + (Math.random() - 0.5) * 0.12;
        const lng = 77.1025 + (Math.random() - 0.5) * 0.18;
        const intensity = Math.random() * 0.5; // 0 to 0.5
        heatData.push([lat, lng, intensity]);
      }

      // Create heat layer with vibrant neon gradient
      const heat = (L as any).heatLayer(heatData, {
        radius: 30,
        blur: 20,
        maxZoom: 17,
        max: 1.0,
        minOpacity: 0.3,
        gradient: {
          0.0: 'rgba(0, 0, 0, 0)',
          0.2: 'rgba(0, 100, 255, 0.8)',   // Deep blue
          0.3: 'rgba(0, 200, 255, 0.9)',   // Cyan
          0.5: 'rgba(0, 255, 100, 0.9)',   // Bright green
          0.7: 'rgba(255, 255, 0, 0.95)',  // Yellow
          0.85: 'rgba(255, 150, 0, 1)',    // Orange
          1.0: 'rgba(255, 0, 0, 1)'        // Red
        }
      }).addTo(map);

      mapRef.current = map;
      heatLayerRef.current = heat;
    };

    initMap();

    return () => {
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
  }, [timePeriod]);

  return (
    <div className="bg-gray-900 border border-gray-800 rounded-lg overflow-hidden">
      <div className="flex items-center justify-between p-4 border-b border-gray-800">
        <div className="flex items-center gap-2">
          <BarChart className="w-4 h-4 text-blue-400" />
          <h3 className="text-sm font-semibold">Map overview</h3>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" className="h-7 w-7 p-0">
            <Download className="w-3 h-3" />
          </Button>
          <Select defaultValue={timePeriod}>
            <SelectTrigger className="w-28 h-7 text-xs bg-gray-800 border-gray-700">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="z-[9999]">
              <SelectItem value="morning">MORNING</SelectItem>
              <SelectItem value="night">NIGHT</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Frequency Scale */}
      <div className="px-4 py-2 bg-gray-800/50">
        <div className="text-xs text-gray-500 mb-1">Frequency</div>
        <div className="flex items-center gap-2">
          <span className="text-xs">Low</span>
          <div className="flex-1 h-2 rounded-full bg-gradient-to-r from-blue-500 via-cyan-500 via-green-500 via-yellow-500 via-orange-500 to-red-500" />
          <span className="text-xs">High</span>
        </div>
      </div>

      {/* Leaflet Heatmap */}
      <div ref={containerRef} className="h-80 bg-black relative" style={{ filter: 'brightness(0.85) contrast(1.2)' }} />
    </div>
  );
}

function DispatcherListCard({ timePeriod }: { timePeriod: TimePeriod }) {
  const dispatchers = [
    { id: '001', role: '912', active: '10:03:20 AM UT', status: 'Active', contact: '+1 714123456', languages: 'English, Spanish' },
    { id: '002', role: '911', active: '10:18:20 AM UT', status: 'Active', contact: '+1 714123456', languages: 'English, Spanish' },
    { id: '003', role: 'RCO', active: '10:03:20 AM UT', status: 'Busy', contact: '+1 714123456', languages: 'English' },
    { id: '004', role: 'Transit', active: '10:08:12 AM UT', status: 'Active', contact: '+1 714123456', languages: 'English, Chinese' },
    { id: '005', role: 'Transit', active: '10:03:20 AM UT', status: 'Busy', contact: '+1 714123456', languages: 'English, Vietnamese' },
  ];

  return (
    <div className="bg-gray-900 border border-gray-800 rounded-lg">
      <div className="flex items-center justify-between p-4 border-b border-gray-800">
        <h3 className="text-sm font-semibold">Dispatcher list</h3>
        <Select defaultValue={timePeriod}>
          <SelectTrigger className="w-28 h-7 text-xs bg-gray-800 border-gray-700">
            <SelectValue />
          </SelectTrigger>
          <SelectContent className="z-[9999]">
            <SelectItem value="morning">MORNING</SelectItem>
            <SelectItem value="night">NIGHT</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-gray-800/50 text-xs text-gray-400">
            <tr>
              <th className="px-4 py-2 text-left font-medium">ID</th>
              <th className="px-4 py-2 text-left font-medium">Role</th>
              <th className="px-4 py-2 text-left font-medium">Last Active</th>
              <th className="px-4 py-2 text-left font-medium">Status</th>
              <th className="px-4 py-2 text-left font-medium">Contact</th>
              <th className="px-4 py-2 text-left font-medium">Languages</th>
            </tr>
          </thead>
          <tbody className="text-xs">
            {dispatchers.map((dispatcher, index) => (
              <tr key={dispatcher.id} className={index % 2 === 0 ? 'bg-gray-800/20' : ''}>
                <td className="px-4 py-3 flex items-center gap-2">
                  <Users className="w-3 h-3 text-gray-500" />
                  {dispatcher.id}
                </td>
                <td className="px-4 py-3">{dispatcher.role}</td>
                <td className="px-4 py-3">{dispatcher.active}</td>
                <td className="px-4 py-3">
                  <Badge
                    variant={dispatcher.status === 'Active' ? 'default' : 'secondary'}
                    className="text-xs"
                  >
                    {dispatcher.status}
                  </Badge>
                </td>
                <td className="px-4 py-3 text-gray-400">{dispatcher.contact}</td>
                <td className="px-4 py-3 text-gray-400">{dispatcher.languages}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function RecommendationCard({ icon, title, text }: { icon: React.ReactNode; title: string; text: string }) {
  return (
    <div className="bg-orange-500/10 border border-orange-500/30 rounded-lg p-4">
      <div className="flex items-start gap-3">
        <div className="mt-0.5">{icon}</div>
        <div>
          <h4 className="text-sm font-semibold text-orange-400 mb-1">{title}</h4>
          <p className="text-xs text-gray-300 leading-relaxed">{text}</p>
        </div>
      </div>
    </div>
  );
}

