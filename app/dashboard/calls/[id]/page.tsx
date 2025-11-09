/**
 * Pulse112 Call Detail Page
 * Detailed view of emergency call with Hume EVI voice interface, transcript, and AI triage
 */

'use client';

import { use, useState, useEffect } from 'react';
import { EmergencyCall, TranscriptSegment } from '@/lib/types';
import { mockCalls, mockTranscript, getTimeElapsed, getSeverityColor, getEmotionEmoji } from '@/lib/mock-data';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  ArrowLeft, 
  MapPin, 
  Phone, 
  Clock, 
  Activity, 
  User, 
  AlertTriangle,
  CheckCircle,
  XCircle,
  Mic,
  MessageSquare,
  Brain,
  Siren,
  TrendingUp
} from 'lucide-react';
import Link from 'next/link';

interface PageProps {
  params: Promise<{ id: string }>;
}

export default function CallDetailPage({ params }: PageProps) {
  const resolvedParams = use(params);
  const callId = resolvedParams.id;
  
  const [call, setCall] = useState<EmergencyCall | null>(null);
  const [transcript, setTranscript] = useState<TranscriptSegment[]>([]);
  const [isHumeLoading, setIsHumeLoading] = useState(true);

  useEffect(() => {
    // Load call data from localStorage first, then mock data
    const loadCall = () => {
      // Try localStorage first
      try {
        const storedCalls = localStorage.getItem('kwik_emergency_calls');
        if (storedCalls) {
          const newCalls = JSON.parse(storedCalls);
          const foundInStorage = newCalls.find((c: EmergencyCall) => c.id === callId);
          if (foundInStorage) {
            setCall(foundInStorage);
            console.log('✅ Loaded call from localStorage:', callId);
            return;
          }
        }
      } catch (error) {
        console.error('Error loading from localStorage:', error);
      }

      // Fallback to mock data
      const foundCall = mockCalls.find((c) => c.id === callId);
      if (foundCall) {
        setCall(foundCall);
        // Simulate loading transcript
        if (foundCall.id === '1') {
          setTranscript(mockTranscript);
        }
      }
    };

    loadCall();

    // Simulate Hume iframe loading
    setTimeout(() => setIsHumeLoading(false), 1500);
  }, [callId]);

  if (!call) {
    return (
      <div className="h-screen flex items-center justify-center bg-black text-white">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto mb-4"></div>
          <p>Loading call details...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-white">
      {/* Header */}
      <header className="bg-gray-900 border-b border-gray-800 px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href="/dashboard">
              <Button variant="ghost" size="sm" className="gap-2">
                <ArrowLeft className="w-4 h-4" />
                Back to Dashboard
              </Button>
            </Link>
            <div className="h-6 w-px bg-gray-700"></div>
            <div>
              <h1 className="text-xl font-bold">Call #{callId}</h1>
              <p className="text-sm text-gray-400">
                {call.incident_subtype || call.incident_type} • {getTimeElapsed(call.created_at)}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Badge className={`${getSeverityColor(call.severity)} text-sm px-3 py-1`}>
              {call.severity?.toUpperCase()}
            </Badge>
            {call.status === 'active' && (
              <Badge variant="outline" className="border-green-500 text-green-400 animate-pulse">
                LIVE CALL
              </Badge>
            )}
          </div>
        </div>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 p-6">
        {/* Left Column - Hume Voice Interface */}
        <div className="lg:col-span-2 space-y-6">
          {/* Hume EVI Embedded Interface */}
          <Card className="bg-gray-900 border-gray-800">
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold flex items-center gap-2">
                  <Mic className="w-5 h-5 text-blue-500" />
                  Live Voice Interface (Hume EVI)
                </h2>
                <Badge variant="outline" className="border-blue-500 text-blue-400">
                  AI Assistant
                </Badge>
              </div>

              {/* Hume EVI iframe placeholder */}
              <div className="relative bg-gray-800 rounded-lg overflow-hidden" style={{ height: '500px' }}>
                {isHumeLoading && (
                  <div className="absolute inset-0 flex items-center justify-center bg-gray-800 z-10">
                    <div className="text-center">
                      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
                      <p className="text-gray-400">Loading Hume EVI...</p>
                    </div>
                  </div>
                )}
                
                {/* Hume EVI Embedded Voice Interface */}
                <iframe
                  src={
                    process.env.NEXT_PUBLIC_HUME_CONFIG_ID
                      ? `https://voice-widget.hume.ai/?config_id=${process.env.NEXT_PUBLIC_HUME_CONFIG_ID}`
                      : 'about:blank'
                  }
                  className="w-full h-full"
                  allow="microphone; autoplay"
                  title="Hume EVI Voice Interface"
                  style={{ border: 'none' }}
                />

                {/* Placeholder UI for demo */}
                <div className="absolute inset-0 flex flex-col items-center justify-center p-8 text-center">
                  <div className="mb-8">
                    <div className="w-24 h-24 bg-blue-500/20 rounded-full flex items-center justify-center mb-4 mx-auto animate-pulse">
                      <Mic className="w-12 h-12 text-blue-500" />
                    </div>
                    <h3 className="text-xl font-semibold mb-2">Hume EVI Ready</h3>
                    <p className="text-gray-400 mb-4">
                      Empathic Voice Interface for emergency triage
                    </p>
                  </div>

                  <div className="space-y-3 max-w-md">
                    <div className="bg-gray-700/50 rounded-lg p-4 text-left">
                      <p className="text-sm">
                        <strong className="text-blue-400">🎯 Configuration:</strong> Pulse112 Emergency Triage Agent
                      </p>
                    </div>
                    <div className="bg-gray-700/50 rounded-lg p-4 text-left">
                      <p className="text-sm">
                        <strong className="text-green-400">✅ Status:</strong> Microphone access granted
                      </p>
                    </div>
                    <div className="bg-gray-700/50 rounded-lg p-4 text-left">
                      <p className="text-sm">
                        <strong className="text-purple-400">🧠 Emotions:</strong> Real-time emotion detection active
                      </p>
                    </div>
                  </div>

                  <div className="mt-8">
                    <Button className="bg-blue-600 hover:bg-blue-700">
                      <Mic className="w-4 h-4 mr-2" />
                      Start Voice Call
                    </Button>
                  </div>

                  <p className="text-xs text-gray-500 mt-6">
                    Add your Hume EVI embed URL to activate live voice interface
                  </p>
                </div>
              </div>

              {/* Real-time Emotion Display */}
              {call.top_emotion && (
                <div className="mt-4 p-4 bg-gray-800 rounded-lg">
                  <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
                    <Activity className="w-4 h-4 text-purple-500" />
                    Detected Emotions
                  </h3>
                  <div className="flex items-center gap-4">
                    <div className="flex-1">
                      <div className="flex items-center justify-between text-sm mb-1">
                        <span>{getEmotionEmoji(call.top_emotion)} {call.top_emotion}</span>
                        <span className="font-semibold">{Math.round((call.emotion_intensity || 0) * 100)}%</span>
                      </div>
                      <div className="h-2 bg-gray-700 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-purple-500 transition-all duration-300"
                          style={{ width: `${(call.emotion_intensity || 0) * 100}%` }}
                        ></div>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </Card>

          {/* Transcript Tab */}
          <Card className="bg-gray-900 border-gray-800">
            <div className="p-6">
              <Tabs defaultValue="transcript" className="w-full">
                <TabsList className="bg-gray-800">
                  <TabsTrigger value="transcript" className="flex items-center gap-2">
                    <MessageSquare className="w-4 h-4" />
                    Transcript
                  </TabsTrigger>
                  <TabsTrigger value="ai-analysis" className="flex items-center gap-2">
                    <Brain className="w-4 h-4" />
                    AI Analysis
                  </TabsTrigger>
                  <TabsTrigger value="recommendations" className="flex items-center gap-2">
                    <Siren className="w-4 h-4" />
                    Recommendations
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="transcript" className="mt-4">
                  <ScrollArea className="h-96">
                    {transcript.length > 0 ? (
                      <div className="space-y-4">
                        {transcript.map((segment) => (
                          <div
                            key={segment.id}
                            className={`flex gap-3 ${
                              segment.speaker === 'user' ? 'flex-row-reverse' : ''
                            }`}
                          >
                            <div
                              className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${
                                segment.speaker === 'user'
                                  ? 'bg-blue-500'
                                  : 'bg-gray-700'
                              }`}
                            >
                              {segment.speaker === 'user' ? '👤' : '🤖'}
                            </div>
                            <div
                              className={`flex-1 max-w-xl ${
                                segment.speaker === 'user' ? 'text-right' : ''
                              }`}
                            >
                              <div className="text-xs text-gray-400 mb-1">
                                {segment.speaker === 'user' ? 'Caller' : 'AI Assistant'} •{' '}
                                {new Date(segment.timestamp).toLocaleTimeString()}
                                {segment.top_emotion && (
                                  <span className="ml-2">
                                    {getEmotionEmoji(segment.top_emotion)} {segment.top_emotion}{' '}
                                    {Math.round((segment.emotion_intensity || 0) * 100)}%
                                  </span>
                                )}
                              </div>
                              <div
                                className={`inline-block p-3 rounded-lg ${
                                  segment.speaker === 'user'
                                    ? 'bg-blue-600'
                                    : 'bg-gray-800'
                                }`}
                              >
                                <p className="text-sm">{segment.text}</p>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-center py-12 text-gray-500">
                        <MessageSquare className="w-12 h-12 mx-auto mb-3 opacity-50" />
                        <p>No transcript available yet</p>
                        <p className="text-xs mt-1">Transcript will appear as conversation progresses</p>
                      </div>
                    )}
                  </ScrollArea>
                </TabsContent>

                <TabsContent value="ai-analysis" className="mt-4">
                  <div className="space-y-4">
                    {/* AI Summary */}
                    {call.ai_summary && (
                      <div className="p-4 bg-gray-800 rounded-lg">
                        <h3 className="text-sm font-semibold mb-2 flex items-center gap-2">
                          <Brain className="w-4 h-4 text-blue-500" />
                          AI Summary
                        </h3>
                        <p className="text-sm text-gray-300">{call.ai_summary}</p>
                        <div className="mt-2 text-xs text-gray-400">
                          Confidence: {Math.round((call.ai_confidence || 0) * 100)}%
                        </div>
                      </div>
                    )}

                    {/* Extracted Entities */}
                    <div className="grid grid-cols-2 gap-4">
                      <div className="p-4 bg-gray-800 rounded-lg">
                        <h4 className="text-xs font-semibold text-gray-400 mb-2">Incident Type</h4>
                        <p className="text-sm font-medium">{call.incident_type || 'Unknown'}</p>
                        <p className="text-xs text-gray-400 mt-1">{call.incident_subtype}</p>
                      </div>
                      <div className="p-4 bg-gray-800 rounded-lg">
                        <h4 className="text-xs font-semibold text-gray-400 mb-2">Persons Involved</h4>
                        <p className="text-sm font-medium">{call.persons_involved || 0} people</p>
                      </div>
                    </div>

                    {/* Immediate Threats */}
                    {call.immediate_threats && call.immediate_threats.length > 0 && (
                      <div className="p-4 bg-red-900/20 border border-red-800 rounded-lg">
                        <h3 className="text-sm font-semibold mb-2 flex items-center gap-2 text-red-400">
                          <AlertTriangle className="w-4 h-4" />
                          Immediate Threats
                        </h3>
                        <ul className="space-y-1">
                          {call.immediate_threats.map((threat, i) => (
                            <li key={i} className="text-sm text-gray-300">
                              • {threat}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                </TabsContent>

                <TabsContent value="recommendations" className="mt-4">
                  {call.ai_recommendation ? (
                    <div className="space-y-4">
                      {/* Primary Recommendation */}
                      {typeof call.ai_recommendation === 'object' && 'primary_unit' in call.ai_recommendation ? (
                      <div className="p-4 bg-blue-900/20 border border-blue-800 rounded-lg">
                        <h3 className="text-sm font-semibold mb-2 flex items-center gap-2 text-blue-400">
                          <Siren className="w-4 h-4" />
                          Recommended Action
                        </h3>
                        <div className="space-y-2">
                          <div>
                            <span className="text-xs text-gray-400">Primary Unit:</span>
                            <p className="text-sm font-medium">{call.ai_recommendation.primary_unit}</p>
                          </div>
                          {call.ai_recommendation.support_units.length > 0 && (
                            <div>
                              <span className="text-xs text-gray-400">Support Units:</span>
                              <p className="text-sm">{call.ai_recommendation.support_units.join(', ')}</p>
                            </div>
                          )}
                          <div>
                            <span className="text-xs text-gray-400">Priority Code:</span>
                            <p className="text-sm font-medium text-red-400">
                              {call.ai_recommendation.priority_code}
                            </p>
                          </div>
                          <div>
                            <span className="text-xs text-gray-400">Special Instructions:</span>
                            <p className="text-sm">{call.ai_recommendation.special_instructions}</p>
                          </div>
                        </div>
                      </div>
                      ) : (
                        <div className="p-4 bg-blue-900/20 border border-blue-800 rounded-lg">
                          <p className="text-sm">{typeof call.ai_recommendation === 'string' ? call.ai_recommendation : 'No recommendations available'}</p>
                        </div>
                      )}

                      {/* Rationale */}
                      {typeof call.ai_recommendation === 'object' && 'rationale' in call.ai_recommendation && (
                      <div className="p-4 bg-gray-800 rounded-lg">
                        <h4 className="text-xs font-semibold text-gray-400 mb-2">Rationale</h4>
                        <p className="text-sm text-gray-300">{call.ai_recommendation.rationale}</p>
                        <div className="mt-3 flex items-center gap-2">
                          <TrendingUp className="w-4 h-4 text-green-500" />
                          <span className="text-xs text-gray-400">
                            AI Confidence: {Math.round(call.ai_recommendation.confidence * 100)}%
                          </span>
                        </div>
                      </div>
                      )}

                      {/* Approval Actions */}
                      {typeof call.ai_recommendation === 'object' && (
                      <div className="flex gap-3">
                        <Button className="flex-1 bg-green-600 hover:bg-green-700">
                          <CheckCircle className="w-4 h-4 mr-2" />
                          Approve & Dispatch
                        </Button>
                        <Button variant="outline" className="flex-1 border-red-600 text-red-400 hover:bg-red-600/10">
                          <XCircle className="w-4 h-4 mr-2" />
                          Override
                        </Button>
                      </div>
                      )}
                    </div>
                  ) : (
                    <div className="text-center py-12 text-gray-500">
                      <Siren className="w-12 h-12 mx-auto mb-3 opacity-50" />
                      <p>AI recommendations pending</p>
                      <p className="text-xs mt-1">Processing call data...</p>
                    </div>
                  )}
                </TabsContent>
              </Tabs>
            </div>
          </Card>
        </div>

        {/* Right Column - Call Details */}
        <div className="space-y-6">
          {/* Caller Information */}
          <Card className="bg-gray-900 border-gray-800 p-6">
            <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <User className="w-5 h-5 text-blue-500" />
              Caller Information
            </h2>
            <div className="space-y-3 text-sm">
              <div>
                <span className="text-gray-400">Phone Number:</span>
                <p className="font-medium">{call.caller_number}</p>
              </div>
              <div>
                <span className="text-gray-400">Condition:</span>
                <p className="font-medium capitalize">{call.caller_condition || 'Unknown'}</p>
              </div>
              <div>
                <span className="text-gray-400">Call Duration:</span>
                <p className="font-medium">{call.call_duration || 0}s</p>
              </div>
            </div>
          </Card>

          {/* Location Information */}
          <Card className="bg-gray-900 border-gray-800 p-6">
            <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <MapPin className="w-5 h-5 text-green-500" />
              Location Data
            </h2>
            <div className="space-y-4">
              {/* Caller Location */}
              {call.caller_location && (
                <div className="p-3 bg-gray-800 border border-gray-700 rounded-lg">
                  <p className="text-sm font-medium mb-1">
                    {call.caller_location.address || 'Address unknown'}
                  </p>
                  <p className="text-xs text-gray-400">
                    {call.caller_location.city}, {call.caller_location.state}
                  </p>
                  <p className="text-xs text-gray-400 mt-2">
                    📍 {call.caller_location.latitude?.toFixed(4)}, {call.caller_location.longitude?.toFixed(4)}
                  </p>
                  <p className="text-xs text-gray-400 mt-1">
                    <span className="font-semibold">Confidence:</span>{' '}
                    {Math.round((call.caller_location.confidence || call.location_confidence || 0) * 100)}%
                  </p>
                </div>
              )}
            </div>
          </Card>

          {/* Timeline */}
          <Card className="bg-gray-900 border-gray-800 p-6">
            <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <Clock className="w-5 h-5 text-purple-500" />
              Timeline
            </h2>
            <div className="space-y-3 text-sm">
              <div className="flex items-start gap-3">
                <div className="w-2 h-2 bg-green-500 rounded-full mt-2"></div>
                <div>
                  <p className="font-medium">Call initiated</p>
                  <p className="text-xs text-gray-400">
                    {new Date(call.created_at).toLocaleString()}
                  </p>
                </div>
              </div>
              {call.dispatch_time && (
                <div className="flex items-start gap-3">
                  <div className="w-2 h-2 bg-blue-500 rounded-full mt-2"></div>
                  <div>
                    <p className="font-medium">Units dispatched</p>
                    <p className="text-xs text-gray-400">
                      {new Date(call.dispatch_time).toLocaleString()}
                    </p>
                  </div>
                </div>
              )}
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}

