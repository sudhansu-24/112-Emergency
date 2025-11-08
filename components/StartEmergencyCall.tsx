/**
 * KWIK Start Emergency Call Component
 * Opens Hume EVI interface for real voice conversation with emotion analysis
 */

'use client';

import { useState, useEffect } from 'react';
// Removed Dialog imports - using custom modal instead
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Phone, Mic, Loader2 } from 'lucide-react';

interface StartEmergencyCallProps {
  onCallCreated?: (callId: string) => void;
}

export default function StartEmergencyCall({ onCallCreated }: StartEmergencyCallProps) {
  const [open, setOpen] = useState(false);
  const [phoneNumber, setPhoneNumber] = useState('+14155550000');
  const [callId, setCallId] = useState<string | null>(null);
  const [isHumeLoading, setIsHumeLoading] = useState(true);
  const [conversationData, setConversationData] = useState<any>({
    transcript: [],
    emotions: [],
    started: false,
    ended: false,
  });

  // Generate unique call ID when dialog opens
  useEffect(() => {
    if (open && !callId) {
      const newCallId = `call_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      setCallId(newCallId);
      console.log('🆕 New call session started:', newCallId);
    }
  }, [open, callId]);

  // Listen for Hume postMessage events
  useEffect(() => {
    const handleHumeMessage = (event: MessageEvent) => {
      // Verify origin is from Hume
      if (!event.origin.includes('hume.ai')) return;

      console.log('📨 Hume event:', event.data);

      const { type, data } = event.data;

      switch (type) {
        case 'evi:conversation:started':
          console.log('🎙️ Conversation started');
          setConversationData((prev: any) => ({ ...prev, started: true }));
          setIsHumeLoading(false);
          break;

        case 'evi:message:user':
          console.log('👤 User said:', data?.text);
          setConversationData((prev: any) => ({
            ...prev,
            transcript: [...prev.transcript, {
              speaker: 'user',
              text: data?.text,
              emotions: data?.emotions,
              timestamp: new Date().toISOString(),
            }],
            emotions: [...prev.emotions, data?.emotions],
          }));
          break;

        case 'evi:message:assistant':
          console.log('🤖 AI responded:', data?.text);
          setConversationData((prev: any) => ({
            ...prev,
            transcript: [...prev.transcript, {
              speaker: 'assistant',
              text: data?.text,
              timestamp: new Date().toISOString(),
            }],
          }));
          break;

        case 'evi:emotion:update':
          console.log('😰 Emotion detected:', data?.topEmotion, data?.intensity);
          setConversationData((prev: any) => ({
            ...prev,
            emotions: [...prev.emotions, data],
          }));
          break;

        case 'evi:conversation:ended':
          console.log('🛑 Conversation ended');
          setConversationData((prev: any) => ({ ...prev, ended: true }));
          handleConversationEnd(data);
          break;
      }
    };

    window.addEventListener('message', handleHumeMessage);
    return () => window.removeEventListener('message', handleHumeMessage);
  }, [callId]);

  // Handle conversation end - analyze with Hume + GPT and create emergency call
  const handleConversationEnd = async (humeData: any) => {
    if (!callId) return;

    console.log('💾 Analyzing conversation and creating emergency call...');
    console.log('📊 Hume data received:', humeData);

    try {
      // Extract chat_group_id from Hume data
      // The Hume iframe should provide this when conversation ends
      const chatGroupId = humeData?.chat_group_id || 
                         humeData?.conversation_id || 
                         humeData?.id || 
                         callId; // Fallback to our call ID
      
      const configId = process.env.NEXT_PUBLIC_HUME_CONFIG_ID || humeData?.config_id;

      console.log('🔍 Extracting conversation data:', {
        chatGroupId,
        configId,
        phoneNumber
      });

      // Step 1: Analyze conversation with Hume API + GPT
      const analysisResponse = await fetch('/api/analyze/conversation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_group_id: chatGroupId,
          config_id: configId,
          phone_number: phoneNumber,
        }),
      });

      if (!analysisResponse.ok) {
        const error = await analysisResponse.json();
        console.error('❌ Analysis failed:', error);
        
        // Fallback: use local conversation data
        return handleFallbackCallCreation(chatGroupId);
      }

      const analysisData = await analysisResponse.json();
      console.log('✅ Conversation analysis complete:', {
        severity: analysisData.analysis?.severity,
        labels: analysisData.analysis?.labels,
        confidence: analysisData.analysis?.confidence
      });

      // Step 2: Create emergency call with full analysis
      const transcript = analysisData.transcript || conversationData.transcript;
      const analysis = analysisData.analysis;

      const callData = {
        phoneNumber,
        conversationId: chatGroupId,
        transcript: transcript.map((t: any) => ({
          text: t.text || '',
          role: t.role || t.speaker || 'user',
          timestamp: t.timestamp
        })),
        emotions: analysisData.raw_hume_data?.emotions || [],
      };

      const createResponse = await fetch('/api/calls/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(callData),
      });

      if (!createResponse.ok) {
        throw new Error('Failed to create call');
      }

      const createData = await createResponse.json();
      const emergencyCall = createData.call;

      // Step 3: Enrich the call with GPT analysis
      emergencyCall.analysis = analysis;
      emergencyCall.incident_type = analysis.incident_type || 'emergency';
      emergencyCall.incident_subtype = analysis.incident_type || 'Unknown';
      emergencyCall.severity = analysis.severity || 'medium';
      emergencyCall.severity_score = analysis.severity_score || 50;
      emergencyCall.ai_summary = analysis.summary || 'Emergency call received';
      emergencyCall.ai_confidence = analysis.confidence || 0.7;
      emergencyCall.persons_involved = analysis.persons_involved || 1;
      emergencyCall.immediate_threats = analysis.immediate_threats || [];
      emergencyCall.priority_code = analysis.priority_code || 'Code 2';
      emergencyCall.caller_condition = analysis.caller_condition || 'distressed';
      emergencyCall.labels = analysis.labels || [];
      emergencyCall.flags = analysis.flags || [];
      emergencyCall.recommended_units = analysis.recommended_units || [];
      emergencyCall.special_instructions = analysis.special_instructions || '';
      
      // Location from GPT analysis
      if (analysis.location_mentioned && analysis.location_mentioned !== 'Unknown') {
        emergencyCall.caller_location = emergencyCall.caller_location || {};
        emergencyCall.caller_location.address = analysis.location_mentioned;
      }

      console.log('✅ Emergency call created with full analysis:', {
        id: emergencyCall.id,
        severity: emergencyCall.severity,
        labels: emergencyCall.labels,
        flags: emergencyCall.flags
      });

      // Save to localStorage
      const storedCalls = localStorage.getItem('kwik_emergency_calls');
      const existingCalls = storedCalls ? JSON.parse(storedCalls) : [];
      localStorage.setItem('kwik_emergency_calls', JSON.stringify([emergencyCall, ...existingCalls]));
      console.log('💾 Call saved to localStorage');

      // Close modal and notify
      setOpen(false);
      if (onCallCreated) onCallCreated(emergencyCall.id);

      // Show detailed success message
      const flagsText = emergencyCall.flags.length > 0 
        ? `\n🚨 FLAGS: ${emergencyCall.flags.join(', ')}`
        : '';
      
      const unitsText = emergencyCall.recommended_units.length > 0
        ? `\n🚒 DISPATCH: ${emergencyCall.recommended_units.slice(0, 2).join(', ')}`
        : '';

      alert(`✅ Emergency Call Analyzed!\n\n` +
            `📞 Call ID: ${emergencyCall.id}\n` +
            `🎯 Type: ${emergencyCall.incident_type || 'Unknown'}\n` +
            `⚠️ Severity: ${emergencyCall.severity?.toUpperCase()} (${Math.round(emergencyCall.severity_score)}/100)\n` +
            `😰 Caller: ${emergencyCall.caller_condition}\n` +
            `🏷️ Labels: ${emergencyCall.labels?.slice(0, 3).join(', ') || 'None'}` +
            flagsText +
            unitsText +
            `\n\n✅ Analysis Confidence: ${Math.round((emergencyCall.ai_confidence || 0) * 100)}%`
      );

    } catch (error) {
      console.error('❌ Failed to analyze/create call:', error);
      alert('⚠️ Failed to analyze conversation. Please try again.');
    }
  };

  // Fallback call creation when Hume API is not available
  const handleFallbackCallCreation = async (chatGroupId: string) => {
    console.log('⚠️ Using fallback call creation (no Hume API)');
    
    // Extract key information from local conversation data
    const fullTranscript = conversationData.transcript
      .map((t: any) => `${t.speaker}: ${t.text}`)
      .join('\n');

    // Get average emotion intensity
    const emotions = conversationData.emotions.filter((e: any) => e);
    const avgIntensity = emotions.length > 0
      ? emotions.reduce((sum: number, e: any) => sum + (e.intensity || 0), 0) / emotions.length
      : 0.5;

    // Get most common emotion
    const topEmotions = emotions.map((e: any) => e.topEmotion).filter(Boolean) as string[];
    const topEmotion = topEmotions.length > 0
      ? topEmotions.sort((a: string, b: string) =>
          topEmotions.filter((e: string) => e === a).length -
          topEmotions.filter((e: string) => e === b).length
        ).pop()
      : 'distress';

    // Create call with local data
    const response = await fetch('/api/calls/create', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        phoneNumber,
        conversationId: chatGroupId,
        transcript: conversationData.transcript,
        emotions: emotions,
      }),
    });

    if (response.ok) {
      const data = await response.json();
      
      // Save to localStorage
      const storedCalls = localStorage.getItem('kwik_emergency_calls');
      const existingCalls = storedCalls ? JSON.parse(storedCalls) : [];
      localStorage.setItem('kwik_emergency_calls', JSON.stringify([data.call, ...existingCalls]));
      
      setOpen(false);
      if (onCallCreated) onCallCreated(data.call.id);
      
      alert(`✅ Emergency call created!\n\nCall ID: ${data.call.id}\n\nEmotion: ${topEmotion} (${Math.round(avgIntensity * 100)}%)\n\n⚠️ Using basic analysis - configure Hume API for full analysis.`);
    }
  };

  return (
    <>
      {/* Main Emergency Call Button */}
      <Button 
        className="gap-2 bg-red-600 hover:bg-red-700"
        onClick={() => {
          console.log('🔘 Button clicked, opening emergency call modal');
          setOpen(true);
        }}
      >
        <Phone className="w-4 h-4" />
        Start Emergency Call
      </Button>

      {/* Emergency Call Modal */}
      {open && (
        <div 
          className="fixed inset-0 z-[10000] flex items-center justify-center"
          style={{ 
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.8)',
            zIndex: 10000,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              console.log('🔄 Modal closed by clicking outside');
              setOpen(false);
            }
          }}
        >
          <div 
            className="bg-gray-900 text-white rounded-lg border border-gray-700 max-w-4xl w-full mx-4"
            style={{
              backgroundColor: '#111827',
              color: 'white',
              borderRadius: '8px',
              border: '2px solid #374151',
              maxWidth: '64rem',
              width: '100%',
              margin: '0 1rem',
              maxHeight: '80vh',
              display: 'flex',
              flexDirection: 'column',
            }}
          >
            {/* Header */}
            <div className="p-6 border-b border-gray-700">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Mic className="w-5 h-5 text-red-500" />
                  <h2 className="text-lg font-semibold">Emergency Voice Call - AI Triage</h2>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    console.log('🔄 Modal closed by X button');
                    setOpen(false);
                  }}
                  className="text-gray-400 hover:text-white"
                >
                  ✕
                </Button>
              </div>
              <p className="text-gray-400 text-sm mt-2">
                Speak to our AI assistant. Your emotions will be analyzed in real-time to prioritize your emergency.
              </p>
            </div>

            {/* Content */}
            <div className="flex-1 p-6 space-y-4 overflow-y-auto">
              {/* Phone Number Input */}
              <div className="flex gap-3 items-end">
                <div className="flex-1">
                  <label className="text-sm font-medium mb-2 block">Your Phone Number</label>
                  <Input
                    type="tel"
                    value={phoneNumber}
                    onChange={(e) => setPhoneNumber(e.target.value)}
                    placeholder="+1 (415) 555-0000"
                    className="bg-gray-800 border-gray-600 text-white"
                  />
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    const newCallId = `call_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
                    setCallId(newCallId);
                    setConversationData({ transcript: [], emotions: [], started: false, ended: false });
                    setIsHumeLoading(true);
                    console.log('🔄 Call reset:', newCallId);
                  }}
                  className="text-gray-400 hover:text-white"
                >
                  Reset Call
                </Button>
              </div>

              {/* Hume EVI Interface */}
              <div className="relative bg-gray-800 rounded-lg overflow-hidden border-2 border-gray-600" style={{ minHeight: '400px' }}>
                {isHumeLoading && (
                  <div className="absolute inset-0 flex items-center justify-center bg-gray-800 z-10">
                    <div className="text-center">
                      <Loader2 className="w-12 h-12 animate-spin text-blue-500 mx-auto mb-4" />
                      <p className="text-gray-300">Loading Hume AI Voice Interface...</p>
                      <p className="text-sm text-gray-500 mt-2">Allow microphone access when prompted</p>
                    </div>
                  </div>
                )}

                <iframe
                  src="https://112-alpha.vercel.app"
                  className="w-full h-full"
                  allow="microphone; autoplay"
                  title="Hume EVI Emergency Call"
                  style={{ border: 'none', minHeight: '400px', width: '100%' }}
                  onLoad={() => {
                    console.log('🎙️ Hume EVI demo loaded in main modal');
                    setTimeout(() => setIsHumeLoading(false), 1500);
                  }}
                />
              </div>

              {/* Real-time Emotion Display */}
              {conversationData.emotions.length > 0 && (
                <div className="bg-gray-800 rounded-lg p-4">
                  <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
                    <span className="animate-pulse">🔴</span>
                    Live Emotion Detection
                  </h3>
                  <div className="space-y-2">
                    {conversationData.emotions.slice(-3).reverse().map((emotion: any, i: number) => (
                      emotion && (
                        <div key={i} className="flex items-center gap-3">
                          <span className="text-2xl">{getEmotionEmoji(emotion.topEmotion)}</span>
                          <div className="flex-1">
                            <div className="flex justify-between text-xs mb-1">
                              <span className="text-gray-300">{emotion.topEmotion || 'Unknown'}</span>
                              <span className="font-semibold">
                                {Math.round((emotion.intensity || 0) * 100)}%
                              </span>
                            </div>
                            <div className="h-2 bg-gray-700 rounded-full overflow-hidden">
                              <div
                                className={`h-full transition-all duration-300 ${
                                  (emotion.intensity || 0) > 0.7
                                    ? 'bg-red-500'
                                    : (emotion.intensity || 0) > 0.5
                                    ? 'bg-orange-500'
                                    : 'bg-yellow-500'
                                }`}
                                style={{ width: `${(emotion.intensity || 0) * 100}%` }}
                              />
                            </div>
                          </div>
                        </div>
                      )
                    ))}
                  </div>
                </div>
              )}

              {/* Instructions */}
              <div className="bg-blue-900/20 border border-blue-800 rounded-lg p-4">
                <h4 className="text-sm font-semibold text-blue-300 mb-2">🎙️ How to start your emergency call:</h4>
                <ol className="text-xs text-blue-200 space-y-1 list-decimal list-inside">
                  <li>Click "Start" button in the Hume interface above</li>
                  <li>Allow microphone access when prompted</li>
                  <li>Speak clearly about your emergency situation</li>
                  <li>The AI will detect your emotions in real-time</li>
                  <li>Your call will be automatically logged and added to the dashboard</li>
                </ol>
                <p className="text-xs text-blue-300 mt-3 font-semibold">
                  💡 Tip: Speak urgently for higher priority detection!
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

// Helper function for emotion emojis
function getEmotionEmoji(emotion?: string): string {
  switch (emotion?.toLowerCase()) {
    case 'distress':
    case 'panic':
      return '😰';
    case 'fear':
      return '😨';
    case 'anxiety':
    case 'concern':
      return '😟';
    case 'anger':
    case 'frustration':
      return '😠';
    case 'sadness':
      return '😢';
    case 'calm':
      return '😌';
    case 'joy':
    case 'happiness':
      return '😊';
    default:
      return '😐';
  }
}

