/**
 * KWIK Emergency Dashboard - Professional Dispatch Interface
 * Three-panel layout: Call Details | Map | Units Status
 */

'use client';

import { useState, useEffect, useRef } from 'react';
import { EmergencyCall } from '@/lib/types';
import { mockCalls, getTimeElapsed, getSeverityColor } from '@/lib/mock-data';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import dynamic from 'next/dynamic';
import {
  Phone,
  MapPin,
  Clock,
  Activity,
  AlertCircle,
  Flame,
  Users,
  Radio,
  Navigation,
  Send,
  X,
  ThermometerSun,
  Wind,
  Droplets,
  Eye,
  TrendingUp,
  PanelLeftClose,
  PanelLeftOpen,
  Lightbulb,
  Shield,
  ClipboardCheck,
  Settings,
  Database,
  ClipboardList,
} from 'lucide-react';
import StartEmergencyCall from '@/components/StartEmergencyCall';
import IncidentWorkflowOverlay from '@/components/IncidentWorkflowOverlay';
import DataManagementDashboard from '@/components/DataManagementDashboard';
import CallHistoryOverlay from '@/components/CallHistoryOverlay';

// Dynamic map import
const EmergencyMap = dynamic(() => import('@/components/EmergencyMap').then((mod) => mod.default), {
  ssr: false,
  loading: () => (
    <div className="h-full w-full flex items-center justify-center bg-gray-950">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
        <p className="text-gray-400">Loading map...</p>
      </div>
    </div>
  ),
}) as any;

export default function DashboardPage() {
  const [calls, setCalls] = useState<EmergencyCall[]>([]);
  const [selectedCallId, setSelectedCallId] = useState<string | null>(null);
  const [view, setView] = useState<'emergencies' | 'alerts'>('emergencies');
  const [comment, setComment] = useState('');
  const [showNotification, setShowNotification] = useState(true);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const hasAutoSelectedRef = useRef(false);
  const [workflowOpen, setWorkflowOpen] = useState(false);
  const [dataManagementOpen, setDataManagementOpen] = useState(false);
  const [callHistoryOpen, setCallHistoryOpen] = useState(false);

  // Load calls from localStorage + mock data
  useEffect(() => {
    const loadCalls = () => {
      try {
        const storedCalls = localStorage.getItem('kwik_emergency_calls');
        const newCalls = storedCalls ? JSON.parse(storedCalls) : [];
        const allCalls = [...newCalls, ...mockCalls];
        setCalls(allCalls);
        
        // Auto-select first active call on initial load only
        if (!hasAutoSelectedRef.current) {
          const activeCall = allCalls.find((c) => c.status === 'active' || c.call_status === 'in-progress');
          if (activeCall) {
            setSelectedCallId(activeCall.id);
            hasAutoSelectedRef.current = true;
          }
        }
      } catch (error) {
        console.error('Error loading calls:', error);
        setCalls(mockCalls);
      }
    };
    loadCalls();

    // Refresh calls every 5 seconds
    const interval = setInterval(loadCalls, 5000);
    return () => clearInterval(interval);
  }, []);

  const selectedCall = calls.find((c) => c.id === selectedCallId);
  const activeCalls = calls.filter((c) => c.status === 'active' || c.call_status === 'in-progress');
  const criticalCalls = calls.filter((c) => c.severity === 'critical');
  const resolvedCalls = calls.filter((c) => c.status === 'resolved');

  // Mock units data
  const units = [
    { id: 'unit-2341', name: 'Unit 2341', status: 'ready', location: 'Levels Valley', distance: '30 KM away' },
    { id: 'unit-2131', name: 'Unit 2131', status: 'busy', location: 'District 5', distance: '30 KM away' },
    { id: 'pd-district-1', name: 'PD District 1', status: 'ready', location: 'West' },
    { id: 'pd-district-3', name: 'PD District 3', status: 'ready', location: 'West' },
    { id: 'pd-district-4', name: 'PD District 4', status: 'ready', location: 'West' },
  ];

  return (
    <div className="h-screen w-full bg-gray-950 text-gray-100 flex flex-col overflow-hidden">
      {/* Top Navigation Bar */}
      <header className="bg-gray-900 border-b border-gray-800 px-6 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Flame className="w-6 h-6 text-red-500" />
          <h1 className="text-xl font-bold">EMERGENCY DASHBOARD</h1>
        </div>

        {/* Weather & Time */}
        <div className="flex items-center gap-6 text-sm">
          <div className="flex items-center gap-2">
            <ThermometerSun className="w-4 h-4" />
            <span>75°</span>
          </div>
          <div className="flex items-center gap-2">
            <Wind className="w-4 h-4" />
            <span>3mph</span>
          </div>
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4" />
            <span>1 in 2hrs</span>
          </div>
          <div className="flex items-center gap-2">
            <Droplets className="w-4 h-4" />
            <span>2 humid</span>
          </div>
          <div className="flex items-center gap-2">
            <Eye className="w-4 h-4" />
            <span>12mi visible</span>
          </div>
          <div className="px-3 py-1 bg-red-600 rounded text-xs font-semibold">
            {new Date().toLocaleTimeString()} LIVE
          </div>
          <div className="text-sm text-gray-400">New Delhi, India</div>
        </div>
      </header>

      <div className="flex-1 flex overflow-hidden">
        {/* Mini Toolbar */}
        <div className="w-14 bg-gray-950 border-r border-gray-900 flex flex-col items-center py-4 gap-6">
          <Button
            variant="ghost"
            size="icon"
            className="text-gray-400 "
            onClick={() => setSidebarCollapsed((prev) => !prev)}
            title={sidebarCollapsed ? 'Open call panel' : 'Collapse call panel'}
          >
            {sidebarCollapsed ? <PanelLeftOpen className="w-5 h-5" /> : <PanelLeftClose className="w-5 h-5" />}
          </Button>

          <div className="flex flex-col items-center gap-4 text-gray-500">
            <Button
              variant={sidebarCollapsed ? 'ghost' : 'default'}
              size="icon"
              className={
                sidebarCollapsed
                  ? 'text-gray-400'
                  : 'bg-blue-600 text-white hover:bg-blue-700'
              }
              onClick={() => setSidebarCollapsed(false)}
              title="Call queue"
            >
              <Radio className="w-5 h-5" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="text-gray-400"
              onClick={() => {
                if (!selectedCallId && calls.length > 0) {
                  setSelectedCallId(calls[0].id);
                }
                if (!selectedCall) {
                  setSidebarCollapsed(false);
                }
                setWorkflowOpen(true);
              }}
              title="Incident management"
            >
              <Lightbulb className={`w-5 h-5 ${workflowOpen ? 'text-yellow-400' : ''}`} />
            </Button>
            <Button 
              variant="ghost" 
              size="icon" 
              className={`text-gray-500  ${dataManagementOpen ? 'text-blue-400' : ''}`}
              onClick={() => setDataManagementOpen(true)}
              title="Data Management"
            >
              <Database className="w-5 h-5" />
            </Button>
            <Button 
              variant="ghost" 
              size="icon" 
              className={`text-gray-500  ${callHistoryOpen ? 'text-blue-400' : ''}`}
              onClick={() => setCallHistoryOpen(true)}
              title="Call History"
            >
              <ClipboardList className="w-5 h-5" />
            </Button>
            <Button variant="ghost" size="icon" className="text-gray-500 " title="Reports">
              <ClipboardCheck className="w-5 h-5" />
            </Button>
            <Button variant="ghost" size="icon" className="text-gray-500 " title="Settings">
              <Settings className="w-5 h-5" />
            </Button>
          </div>
        </div>

        {/* Left Panel - Calls List */}
        {!sidebarCollapsed && (
        <div className="w-80 bg-gray-900 border-r border-gray-800 flex flex-col">
          {/* Header */}
          <div className="px-4 py-3 border-b border-gray-800 flex items-center justify-between">
            <div className="flex items-center gap-4">
              <button
                onClick={() => setView('emergencies')}
                className={`text-sm font-medium ${view === 'emergencies' ? 'text-white' : 'text-gray-500'}`}
              >
                Emergencies
              </button>
              <button
                onClick={() => setView('alerts')}
                className={`text-sm font-medium ${view === 'alerts' ? 'text-white' : 'text-gray-500'}`}
              >
                Alerts
              </button>
            </div>
            <Button 
              variant="ghost" 
              size="sm"
              onClick={() => setSidebarCollapsed(true)}
              title="Collapse panel"
            >
              <X className="w-4 h-4" />
            </Button>
          </div>

          {/* Search */}
          <div className="px-4 py-3 border-b border-gray-800 flex gap-2 text-black">
            <Input
              placeholder="Search a location"
              className="flex-1 bg-gray-800 border-gray-700 text-sm h-9"
            />
            <Button variant="outline" size="sm" className="text-xs">
              Filter
            </Button>
          </div>

          {/* Stats */}
          <div className="px-4 py-3 border-b border-gray-800 flex gap-6">
            <div>
              <div className="text-xs text-gray-500">Total Calls</div>
              <div className="text-2xl font-bold">{calls.length}</div>
            </div>
            <div>
              <div className="text-xs text-gray-500">Critical</div>
              <div className="text-2xl font-bold text-red-500">{criticalCalls.length}</div>
            </div>
            <div>
              <div className="text-xs text-gray-500">Resolved</div>
              <div className="text-2xl font-bold text-green-500">{resolvedCalls.length}</div>
            </div>
          </div>

          {/* Calls List */}
          <ScrollArea className="flex-1">
            <div className="p-2">
              {/* LIVE Call */}
              {activeCalls.length > 0 && (
                <div className="mb-2">
                  <div className="text-xs text-blue-400 font-semibold mb-2 px-2 flex items-center gap-1">
                    <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse" />
                    LIVE
                  </div>
                  {activeCalls.slice(0, 1).map((call) => (
                    <button
                      key={call.id}
                      onClick={() => setSelectedCallId(call.id)}
                      className={`w-full text-left mb-1 p-3 rounded transition-colors ${
                        selectedCallId === call.id 
                          ? 'bg-gray-700 border border-blue-500' 
                          : 'bg-gray-800 hover:bg-gray-750'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <div className="flex items-center gap-2">
                          <Radio className="w-4 h-4 text-blue-400" />
                          <span className="text-sm font-medium">{call.incident_subtype || call.incident_type}</span>
                        </div>
                      </div>
                      <div className="text-xs text-gray-500">{getTimeElapsed(call.created_at)}</div>
                    </button>
                  ))}
                </div>
              )}

              {/* Critical Calls */}
              {criticalCalls.length > 0 && (
                <div className="mb-2">
                  {criticalCalls.map((call) => (
                    <button
                      key={call.id}
                      onClick={() => setSelectedCallId(call.id)}
                      className={`w-full text-left mb-1 p-3 rounded transition-colors ${
                        selectedCallId === call.id 
                          ? 'bg-gray-700 border border-red-500' 
                          : 'bg-gray-800 hover:bg-gray-750'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <div className="flex items-center gap-2">
                          <Flame className="w-4 h-4 text-red-500" />
                          <span className="text-sm font-medium">{call.incident_subtype || call.incident_type}</span>
                        </div>
                        <Badge className="text-xs bg-red-600">CRITICAL</Badge>
                      </div>
                      <div className="text-xs text-gray-500">{getTimeElapsed(call.created_at)}</div>
                    </button>
                  ))}
                </div>
              )}

              {/* Other Calls */}
              {calls.filter(c => c.severity !== 'critical' && c.status !== 'active').map((call) => (
                <button
                  key={call.id}
                  onClick={() => setSelectedCallId(call.id)}
                  className={`w-full text-left mb-1 p-3 rounded transition-colors ${
                    selectedCallId === call.id 
                      ? 'bg-gray-700 border border-gray-600' 
                      : 'bg-gray-800 hover:bg-gray-750'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center gap-2">
                      {call.severity === 'high' && <AlertCircle className="w-4 h-4 text-orange-500" />}
                      {call.severity === 'medium' && <AlertCircle className="w-4 h-4 text-yellow-500" />}
                      {call.severity === 'low' && <Activity className="w-4 h-4 text-green-500" />}
                      <span className="text-sm font-medium">{call.incident_subtype || call.incident_type}</span>
                    </div>
                    <Badge 
                      className={`text-xs ${
                        call.severity === 'high' ? 'bg-orange-600' :
                        call.severity === 'medium' ? 'bg-yellow-600' :
                        'bg-green-600'
                      }`}
                    >
                      {call.severity?.toUpperCase()}
                    </Badge>
                  </div>
                  <div className="text-xs text-gray-500">{getTimeElapsed(call.created_at)}</div>
                </button>
              ))}
            </div>
          </ScrollArea>
        </div>
        )}

        {/* Call Details Panel (slides in when call selected) */}
        {selectedCall && !sidebarCollapsed && (
          <div className="w-96 bg-gray-900 border-r border-gray-800 flex flex-col">
            {/* Call Header */}
            <div className="px-4 py-3 border-b border-gray-800 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={() => setSelectedCallId(null)}
                  className="mr-2"
                >
                  ←
                </Button>
                <Phone className="w-4 h-4 text-green-500" />
                <span className="text-sm font-semibold">{selectedCall.incident_subtype || 'Emergency'}</span>
                <Badge className={`${getSeverityColor(selectedCall.severity)} text-xs`}>
                  {selectedCall.status?.toUpperCase()}
                </Badge>
              </div>
              <Button variant="ghost" size="sm" onClick={() => setSelectedCallId(null)}>
                <X className="w-4 h-4" />
              </Button>
            </div>

            <ScrollArea className="flex-1">
              {/* Emergency Details */}
              <div className="p-4 space-y-4">
                <div>
                  <h3 className="text-xs font-semibold text-gray-400 uppercase mb-2">Emergency Details</h3>
                  <div className="space-y-2 text-sm">
                    <div>
                      <span className="text-gray-500">Name:</span>
                      <span className="ml-2">Unknown caller</span>
                    </div>
                    <div>
                      <span className="text-gray-500">Time:</span>
                      <span className="ml-2">{new Date(selectedCall.created_at).toLocaleTimeString()}</span>
                    </div>
                    <div>
                      <span className="text-gray-500">Phone:</span>
                      <span className="ml-2">{selectedCall.caller_number}</span>
                    </div>
                    <div>
                      <span className="text-gray-500">Address:</span>
                      <span className="ml-2">{selectedCall.caller_location?.address || 'Unknown'}</span>
                    </div>
                    <div>
                      <span className="text-gray-500">Keywords:</span>
                      <div className="mt-1 flex flex-wrap gap-1">
                        {selectedCall.labels?.slice(0, 3).map((label) => (
                          <Badge key={label} variant="outline" className="text-xs">
                            {label.replace(/_/g, ' ')}
                          </Badge>
                        ))}
                        {selectedCall.immediate_threats?.slice(0, 2).map((threat) => (
                          <Badge key={threat} variant="destructive" className="text-xs">
                            {threat}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Street View */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="text-xs font-semibold text-gray-400 uppercase">Street View</h3>
                    <div className="flex items-center gap-2 text-xs text-gray-500">
                      <MapPin className="w-3 h-3" />
                      <span>Aerial</span>
                    </div>
                  </div>
                  <div className="relative aspect-video bg-gray-800 rounded overflow-hidden">
                    <img
                      src={`https://api.mapbox.com/styles/v1/mapbox/satellite-streets-v12/static/${selectedCall.caller_location?.longitude || -122.4194},${selectedCall.caller_location?.latitude || 37.7749},15,0/400x225@2x?access_token=pk.eyJ1IjoiZXhhbXBsZSIsImEiOiJjbGV4YW1wbGUifQ.example`}
                      alt="Street view"
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        e.currentTarget.src = 'https://via.placeholder.com/400x225/1f2937/9ca3af?text=Street+View';
                      }}
                    />
                    <div className="absolute bottom-2 right-2 bg-black/50 px-2 py-1 rounded text-xs">
                      📍 Location
                    </div>
                  </div>
                </div>

                {/* Caller Emotion */}
                <div>
                  <h3 className="text-xs font-semibold text-gray-400 uppercase mb-3">Caller Emotion</h3>
                  <div className="space-y-3">
                    {/* Distress */}
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-sm">Distress</span>
                        <span className="text-xs text-gray-500">
                          Confidence: {Math.round((selectedCall.ai_confidence || 0.8) * 100)}%
                        </span>
                      </div>
                      <div className="relative w-full h-2 bg-gray-800 rounded-full overflow-hidden">
                        <div 
                          className="absolute inset-y-0 left-0 bg-gradient-to-r from-blue-500 to-cyan-400"
                          style={{ width: `${(selectedCall.emotion_intensity || 0.5) * 100}%` }}
                        />
                      </div>
                      <div className="text-xs text-gray-500 mt-1">
                        {Math.round((selectedCall.emotion_intensity || 0.5) * 100)}%
                      </div>
                    </div>

                    {/* Fear */}
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-sm">Fear</span>
                        <span className="text-xs text-gray-500">
                          Confidence: {Math.round(((selectedCall.ai_confidence || 0.8) - 0.1) * 100)}%
                        </span>
                      </div>
                      <div className="relative w-full h-2 bg-gray-800 rounded-full overflow-hidden">
                        <div 
                          className="absolute inset-y-0 left-0 bg-gradient-to-r from-blue-500 to-cyan-400"
                          style={{ width: `${((selectedCall.emotion_intensity || 0.5) - 0.05) * 100}%` }}
                        />
                      </div>
                      <div className="text-xs text-gray-500 mt-1">
                        {Math.round(((selectedCall.emotion_intensity || 0.5) - 0.05) * 100)}%
                      </div>
                    </div>
                  </div>
                </div>

                {/* Call Transcript */}
                <div>
                  <h3 className="text-xs font-semibold text-gray-400 uppercase mb-3">Call Transcript</h3>
                  <div className="space-y-2 text-sm">
                    {selectedCall.transcript && selectedCall.transcript.length > 0 ? (
                      selectedCall.transcript.slice(0, 10).map((msg: any, idx: number) => (
                        <div key={idx} className="flex gap-2">
                          <span className="text-gray-500 text-xs mt-0.5">{idx + 1}:</span>
                          <div className="flex-1">
                            <span className={msg.role === 'user' ? 'text-cyan-400' : 'text-gray-300'}>
                              {msg.role === 'user' ? 'CALLER: ' : 'DISPATCHER: '}
                            </span>
                            <span className="text-gray-400">{msg.text}</span>
                          </div>
                        </div>
                      ))
                    ) : (
                      <>
                        <div className="flex gap-2">
                          <span className="text-gray-500 text-xs">1:00</span>
                          <div><span className="text-gray-500">DISPATCHER:</span> 911 What's your emergency?</div>
                        </div>
                        <div className="flex gap-2">
                          <span className="text-gray-500 text-xs">1:02</span>
                          <div><span className="text-cyan-400">CALLER:</span> {selectedCall.ai_summary || 'Emergency in progress'}</div>
                        </div>
                        <div className="flex gap-2">
                          <span className="text-gray-500 text-xs">1:05</span>
                          <div><span className="text-gray-500">DISPATCHER:</span> Help is on the way</div>
                        </div>
                      </>
                    )}
                    {selectedCall.call_status === 'in-progress' && (
                      <div className="text-xs text-gray-500 italic flex items-center gap-2">
                        <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
                        loading transcript...
                      </div>
                    )}
                  </div>
                </div>

                {/* Comments */}
                <div>
                  <h3 className="text-xs font-semibold text-gray-400 uppercase mb-3">Comments</h3>
                  <div className="space-y-3 mb-3">
                    <div className="flex gap-2">
                      <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center text-xs font-semibold">
                        JT
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-sm font-medium">John Turner</span>
                          <span className="text-xs text-gray-500">Today at 10:32 AM UT</span>
                        </div>
                        <p className="text-sm text-gray-400">BRWN EYES, BL HIR, F</p>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <div className="w-8 h-8 rounded-full bg-purple-600 flex items-center justify-center text-xs font-semibold">
                        JW
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-sm font-medium">Jasmine Wu</span>
                          <span className="text-xs text-gray-500">Today at 10:28 AM UT</span>
                        </div>
                        <p className="text-sm text-gray-400">Notified chief on this emergency</p>
                      </div>
                    </div>
                  </div>
                  
                  {/* Add Comment */}
                  <div className="flex gap-2">
                    <Input
                      placeholder="Write a comment"
                      value={comment}
                      onChange={(e) => setComment(e.target.value)}
                      className="flex-1 bg-gray-800 border-gray-700 text-sm"
                    />
                    <Button size="sm" className="bg-blue-600 hover:bg-blue-700">
                      Send
                    </Button>
                  </div>
                </div>
              </div>
            </ScrollArea>

            {/* Action Buttons */}
            <div className="p-4 border-t border-gray-800 flex gap-2 text-black">
              <Button variant="outline" className="flex-1">
                Transfer
              </Button>
              <Button className="flex-1 bg-blue-600 hover:bg-blue-700">
                Mitigate
              </Button>
            </div>
            <div className="p-4 border-t border-gray-800">
              <Button
                className="w-full bg-red-600 hover:bg-red-700"
                onClick={() => setWorkflowOpen(true)}
              >
                Open Incident Management
              </Button>
            </div>
          </div>
        )}


        {/* Center - Map */}
        <div className="flex-1 relative">
          {/* Live Call Notification */}
          {activeCalls.length > 0 && showNotification && (
            <div className="absolute top-4 left-1/2 transform -translate-x-1/2 z-[1000]">
              <div className="bg-red-600 text-white px-4 py-2 rounded-lg shadow-lg flex items-center gap-2">
                <div className="w-2 h-2 bg-white rounded-full animate-pulse" />
                <div>
                  <div className="text-xs font-semibold">3 min ago</div>
                  <div className="text-sm">🔥 Critical house fire detected</div>
                  <div className="text-xs opacity-90">Detected 3 mi away in Spring Ave.</div>
                </div>
                <div className="flex gap-2 ml-4">
                  <Button 
                    size="sm" 
                    variant="ghost" 
                    className="text-white hover:bg-red-700 h-7 text-xs"
                    onClick={() => setShowNotification(false)}
                  >
                    Dismiss
                  </Button>
                  <Button 
                    size="sm" 
                    className="bg-white text-red-600 hover:bg-gray-100 h-7 text-xs"
                    onClick={() => {
                      if (activeCalls[0]) {
                        setSelectedCallId(activeCalls[0].id);
                      }
                      setShowNotification(false);
                    }}
                  >
                    View
                  </Button>
                </div>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className="text-white hover:bg-red-700 ml-2"
                  onClick={() => setShowNotification(false)}
                  title="Dismiss notification"
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>
            </div>
          )}

          {/* AI Operator Status */}
          {selectedCall && (
            <div className="absolute top-4 left-4 z-[1000]">
              <div className="bg-gray-900/95 backdrop-blur px-4 py-2 rounded-lg shadow-xl border border-gray-700">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                  <span className="text-sm font-medium">AI Operator Connected</span>
                </div>
                <div className="text-xs text-gray-400 mt-1">Detected: Spanish</div>
              </div>
            </div>
          )}

          <EmergencyMap 
            calls={calls}
            selectedCallId={selectedCallId}
            onMarkerClick={setSelectedCallId}
          />

          {/* Start Emergency Call Button */}
          <div className="absolute bottom-6 left-6 z-[1000]">
            <StartEmergencyCall onCallCreated={(id) => {
              setSelectedCallId(id);
              setView('emergencies');
              // Reload calls
              const loadCalls = () => {
                const storedCalls = localStorage.getItem('kwik_emergency_calls');
                const newCalls = storedCalls ? JSON.parse(storedCalls) : [];
                setCalls([...newCalls, ...mockCalls]);
              };
              setTimeout(loadCalls, 500);
            }} />
          </div>
        </div>

        {/* Right Panel - Unit Status */}
        <div className="w-80 bg-gray-900 border-l border-gray-800 flex flex-col">
          <div className="px-4 py-3 border-b border-gray-800 flex items-center justify-between">
            <h2 className="text-sm font-semibold">Unit status</h2>
            <Button variant="ghost" size="sm">
              <TrendingUp className="w-4 h-4" />
            </Button>
          </div>

          <ScrollArea className="flex-1">
            <div className="p-3 space-y-2">
              {/* Units List */}
              <div className="text-xs text-gray-500 mb-2">Units • Levels Valley</div>
              
              {units.map((unit) => (
                <div 
                  key={unit.id}
                  className="bg-gray-800 rounded p-3 flex items-center justify-between hover:bg-gray-750 transition-colors cursor-pointer"
                >
                  <div className="flex items-center gap-2">
                    <Radio className="w-4 h-4 text-blue-400" />
                    <div>
                      <div className="text-sm font-medium">{unit.name}</div>
                      {unit.distance && (
                        <div className="text-xs text-gray-500">
                          ETA: {unit.distance}
                        </div>
                      )}
                      {unit.location && (
                        <div className="text-xs text-gray-500">
                          Location: {unit.location}
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge 
                      className={`text-xs ${
                        unit.status === 'ready' 
                          ? 'bg-green-600' 
                          : 'bg-red-600'
                      }`}
                    >
                      {unit.status === 'ready' ? '● READY' : '● BUSY'}
                    </Badge>
                  </div>
                </div>
              ))}

              {/* Comms Status */}
              <div className="mt-6">
                <div className="text-xs text-gray-500 mb-2">Comms status</div>
                <div className="space-y-2">
                  <div className="bg-gray-800 rounded p-3">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm">PD 1 • PD Qatar</span>
                    </div>
                    <div className="text-xs text-gray-500">Last active: 2 min ago</div>
                  </div>
                  
                  <div className="bg-gray-800 rounded p-3">
                    <div className="flex items-center gap-2 mb-2">
                      <Users className="w-4 h-4 text-blue-400" />
                      <span className="text-sm font-medium">Joseph Kamball</span>
                      <Button size="sm" variant="ghost" className="ml-auto h-6">
                        <Send className="w-3 h-3" />
                      </Button>
                    </div>
                    <div className="text-xs text-gray-500">Emergency</div>
                    <div className="text-xs text-gray-600 mt-1">2:32:45 PM UT</div>
                  </div>

                  <div className="bg-gray-800 rounded p-3">
                    <div className="flex items-center gap-2 mb-2">
                      <Users className="w-4 h-4 text-blue-400" />
                      <span className="text-sm font-medium">Tim Donaldson</span>
                      <Button size="sm" variant="ghost" className="ml-auto h-6">
                        <Send className="w-3 h-3" />
                      </Button>
                    </div>
                    <div className="text-xs text-gray-600">2:32:45 PM UT</div>
                  </div>
                </div>
              </div>
            </div>
          </ScrollArea>

          {/* Modulus Panel */}
          <div className="p-3 border-t border-gray-800 text-black">
            <div className="text-xs text-gray-500 mb-2">Modulus Panel</div>
            <div className="flex gap-2">
              <Button size="sm" variant="outline" className="flex-1 h-10">
                <Radio className="w-4 h-4" />
              </Button>
              <Button size="sm" variant="outline" className="flex-1 h-10">
                <Navigation className="w-4 h-4" />
              </Button>
              <Button size="sm" variant="outline" className="flex-1 h-10">
                <Activity className="w-4 h-4" />
              </Button>
              <Button size="sm" variant="outline" className="flex-1 h-10">
                <Radio className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </div>
      </div>

      <IncidentWorkflowOverlay
        open={workflowOpen && !!selectedCall}
        onClose={() => setWorkflowOpen(false)}
        call={selectedCall || null}
        calls={calls}
      />

      <DataManagementDashboard
        open={dataManagementOpen}
        onClose={() => setDataManagementOpen(false)}
      />

      <CallHistoryOverlay
        open={callHistoryOpen}
        onClose={() => setCallHistoryOpen(false)}
      />
    </div>
  );
}
