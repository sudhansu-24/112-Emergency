/**
 * Call History Overlay
 * Full-screen overlay for viewing and managing call history
 */

'use client';

import { useState, useEffect } from 'react';
import { EmergencyCall } from '@/lib/types';
import { mockCalls } from '@/lib/mock-data';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  ThermometerSun,
  Wind,
  Droplets,
  Eye,
  Clock,
  Download,
  Phone,
  ExternalLink,
  Archive,
  Trash2,
  Plus,
  X,
  Home,
  Radio,
  Lightbulb,
  Database,
  ClipboardList,
  ClipboardCheck,
  Settings,
} from 'lucide-react';
import { Textarea } from '@/components/ui/textarea';

type FilterType = 'All' | 'PSAP' | 'RTO' | 'Transit';

interface CallHistoryItem extends EmergencyCall {
  wait_time?: string;
  duration?: string;
}

interface CallHistoryOverlayProps {
  open: boolean;
  onClose: () => void;
}

export default function CallHistoryOverlay({ open, onClose }: CallHistoryOverlayProps) {
  const [calls, setCalls] = useState<CallHistoryItem[]>([]);
  const [filterType, setFilterType] = useState<FilterType>('All');
  const [severityFilter, setSeverityFilter] = useState<string>('all');
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  
  // Form state
  const [newCall, setNewCall] = useState({
    severity: 'safe',
    date: '',
    startTime: '',
    endTime: '',
    notes: '',
  });

  useEffect(() => {
    if (!open) return;
    
    // Load calls from localStorage + mock data
    const loadCalls = () => {
      try {
        const storedCalls = localStorage.getItem('kwik_emergency_calls');
        const newCalls = storedCalls ? JSON.parse(storedCalls) : [];
        const allCalls = [...newCalls, ...mockCalls];
        
        // Add computed fields
        const enrichedCalls = allCalls.map(call => ({
          ...call,
          wait_time: `${Math.floor(Math.random() * 30) + 10} sec`,
          duration: `${Math.floor(Math.random() * 5) + 1}:${Math.floor(Math.random() * 60).toString().padStart(2, '0')} min`,
        }));
        
        setCalls(enrichedCalls);
      } catch (error) {
        console.error('Error loading calls:', error);
      }
    };
    loadCalls();
  }, [open]);

  const filteredCalls = calls.filter(call => {
    if (severityFilter !== 'all' && call.severity !== severityFilter) return false;
    // Add more filters based on type if needed
    return true;
  });

  const handleAddCall = () => {
    // Create a new call from form data
    const call: CallHistoryItem = {
      id: `call_${Date.now()}`,
      caller_number: '+1-XXX-XXX-XXXX',
      status: 'resolved',
      call_status: 'completed',
      severity: newCall.severity === 'critical' ? 'critical' : newCall.severity === 'mild' ? 'medium' : 'low',
      severity_score: newCall.severity === 'critical' ? 90 : newCall.severity === 'mild' ? 50 : 20,
      incident_type: 'other',
      created_at: newCall.date || new Date().toISOString(),
      updated_at: new Date().toISOString(),
      duration: '0:00 min',
      wait_time: '0 sec',
      ai_summary: newCall.notes || 'Manual entry',
    };

    const existingCalls = localStorage.getItem('kwik_emergency_calls');
    const parsedCalls = existingCalls ? JSON.parse(existingCalls) : [];
    localStorage.setItem('kwik_emergency_calls', JSON.stringify([call, ...parsedCalls]));
    
    setCalls([call, ...calls]);
    setAddDialogOpen(false);
    
    // Reset form
    setNewCall({
      severity: 'safe',
      date: '',
      startTime: '',
      endTime: '',
      notes: '',
    });
  };

  if (!open) return null;

  return (
    <div className="fixed inset-y-0 left-14 right-0 z-[2000] bg-gray-950 text-gray-100 flex flex-col">
      {/* Header */}
      <header className="bg-gray-900 border-b border-gray-800 px-6 py-3 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Phone className="w-5 h-5 text-blue-500" />
          <h1 className="text-lg font-bold uppercase">Call History</h1>
        </div>
        
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
          <div className="text-sm text-gray-400">SAN FRANCISCO, CA</div>
          
          <Button
            variant="ghost"
            size="icon"
            onClick={onClose}
            className="text-gray-400 hover:text-white"
          >
            <X className="w-5 h-5" />
          </Button>
        </div>
      </header>

      {/* Filters */}
      <div className="bg-gray-900 border-b border-gray-800 px-6 py-3 flex items-center gap-4">
        <button
          onClick={() => setFilterType('All')}
          className={`text-sm font-medium ${
            filterType === 'All' ? 'text-white' : 'text-gray-500'
          }`}
        >
          All
        </button>
        <button
          onClick={() => setFilterType('PSAP')}
          className={`text-sm font-medium ${
            filterType === 'PSAP' ? 'text-white' : 'text-gray-500'
          }`}
        >
          PSAP
        </button>
        <button
          onClick={() => setFilterType('RTO')}
          className={`text-sm font-medium ${
            filterType === 'RTO' ? 'text-white' : 'text-gray-500'
          }`}
        >
          RTO
        </button>
        <button
          onClick={() => setFilterType('Transit')}
          className={`text-sm font-medium ${
            filterType === 'Transit' ? 'text-white' : 'text-gray-500'
          }`}
        >
          Transit
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-6">
        <div className="bg-gray-900 rounded-lg border border-gray-800">
          {/* Table Header */}
          <div className="flex items-center justify-between p-4 border-b border-gray-800">
            <div className="flex items-center gap-2">
              <Phone className="w-4 h-4 text-blue-400" />
              <h2 className="text-sm font-semibold">Call history</h2>
            </div>
            
            <div className="flex items-center gap-3">
              <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                <Download className="w-4 h-4" />
              </Button>
              
              <Select value={severityFilter} onValueChange={setSeverityFilter}>
                <SelectTrigger className="w-28 h-8 text-xs bg-gray-800 border-gray-700">
                  <SelectValue placeholder="Severity" />
                </SelectTrigger>
                <SelectContent className="z-[9999]">
                  <SelectItem value="all">All</SelectItem>
                  <SelectItem value="critical">Critical</SelectItem>
                  <SelectItem value="high">High</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="low">Low</SelectItem>
                </SelectContent>
              </Select>
              
              <Button
                size="sm"
                className="bg-blue-600 hover:bg-blue-700 h-8 text-xs"
                onClick={() => setAddDialogOpen(true)}
              >
                <Plus className="w-4 h-4 mr-1" />
                Add
              </Button>
            </div>
          </div>

          {/* Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-800/50 text-xs text-gray-400">
                <tr>
                  <th className="px-4 py-3 text-left font-medium">ID</th>
                  <th className="px-4 py-3 text-left font-medium">Type</th>
                  <th className="px-4 py-3 text-left font-medium">Time</th>
                  <th className="px-4 py-3 text-left font-medium">Duration</th>
                  <th className="px-4 py-3 text-left font-medium">Wait time</th>
                  <th className="px-4 py-3 text-left font-medium">Severity</th>
                  <th className="px-4 py-3 text-left font-medium">Status</th>
                  <th className="px-4 py-3 text-left font-medium">Actions</th>
                </tr>
              </thead>
              <tbody className="text-xs">
                {filteredCalls.map((call, index) => (
                  <tr
                    key={call.id}
                    className={`${
                      index % 2 === 0 ? 'bg-gray-900' : 'bg-gray-800/20'
                    } hover:bg-gray-800/50 transition-colors`}
                  >
                    <td className="px-4 py-3 font-mono">{call.id.substring(0, 3).padStart(3, '0')}</td>
                    <td className="px-4 py-3 capitalize">{call.incident_type || 'Other'}</td>
                    <td className="px-4 py-3">
                      {new Date(call.created_at).toLocaleString('en-US', {
                        hour: '2-digit',
                        minute: '2-digit',
                        hour12: false,
                      })}{' '}
                      AM UT
                    </td>
                    <td className="px-4 py-3">{call.duration}</td>
                    <td className="px-4 py-3">{call.wait_time}</td>
                    <td className="px-4 py-3">
                      <Badge
                        className={`text-xs uppercase ${
                          call.severity === 'critical'
                            ? 'bg-red-600'
                            : call.severity === 'high'
                            ? 'bg-orange-600'
                            : call.severity === 'medium'
                            ? 'bg-yellow-600'
                            : 'bg-green-600'
                        }`}
                      >
                        {call.severity || 'low'}
                      </Badge>
                    </td>
                    <td className="px-4 py-3 capitalize">{call.status}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-6 w-6 p-0 hover:text-blue-400"
                          onClick={() => window.open(`/dashboard/calls/${call.id}`, '_blank')}
                        >
                          <ExternalLink className="w-3 h-3" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-6 w-6 p-0 hover:text-yellow-400"
                        >
                          <Archive className="w-3 h-3" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-6 w-6 p-0 hover:text-red-400"
                        >
                          <Trash2 className="w-3 h-3" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Add Call Dialog */}
      <Dialog open={addDialogOpen} onOpenChange={setAddDialogOpen}>
        <DialogContent className="bg-gray-900 border-gray-700 text-gray-100 z-[9999]">
          <DialogHeader>
            <DialogTitle>Create a new call</DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            {/* Severity */}
            <div>
              <label className="text-sm font-medium mb-2 block">Severity</label>
              <Select value={newCall.severity} onValueChange={(val) => setNewCall({...newCall, severity: val})}>
                <SelectTrigger className="bg-gray-800 border-gray-700">
                  <SelectValue placeholder="SELECT A SEVERITY" />
                </SelectTrigger>
                <SelectContent className="z-[9999] bg-gray-800 border-gray-700">
                  <SelectItem value="safe">Safe</SelectItem>
                  <SelectItem value="mild">Mild</SelectItem>
                  <SelectItem value="critical">Critical</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Date */}
            <div>
              <Input
                type="text"
                placeholder="MM/DD/YYYY"
                value={newCall.date}
                onChange={(e) => setNewCall({...newCall, date: e.target.value})}
                className="bg-gray-800 border-gray-700"
              />
            </div>

            {/* Time Range */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-gray-400 mb-1 block">Start time (UT)</label>
                <Input
                  type="text"
                  placeholder="HH:MM"
                  value={newCall.startTime}
                  onChange={(e) => setNewCall({...newCall, startTime: e.target.value})}
                  className="bg-gray-800 border-gray-700"
                />
              </div>
              <div>
                <label className="text-xs text-gray-400 mb-1 block">End time (UT)</label>
                <Input
                  type="text"
                  placeholder="HH:MM"
                  value={newCall.endTime}
                  onChange={(e) => setNewCall({...newCall, endTime: e.target.value})}
                  className="bg-gray-800 border-gray-700"
                />
              </div>
            </div>

            {/* Notes */}
            <div>
              <label className="text-sm font-medium mb-2 block">Notes</label>
              <Textarea
                placeholder="Add notes here..."
                value={newCall.notes}
                onChange={(e) => setNewCall({...newCall, notes: e.target.value})}
                className="bg-gray-800 border-gray-700 min-h-[100px]"
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setAddDialogOpen(false)}
              className="border-gray-700"
            >
              Cancel
            </Button>
            <Button
              onClick={handleAddCall}
              className="bg-blue-600 hover:bg-blue-700"
            >
              Create call
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

