/**
 * Pulse112 Start Emergency Call Component
 * Opens Hume EVI interface for real voice conversation with emotion analysis
 */

'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
// Removed Dialog imports - using custom modal instead
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Phone, Mic, Loader2 } from 'lucide-react';
import { logger } from '@/lib/logger';

interface StartEmergencyCallProps {
  onCallCreated?: (callId: string) => void;
}

/**
 * @description Lightweight summary of the most recent Hume conversation.
 */
interface LatestConversationSummary {
  chatGroupId: string;
  messages: Array<{
    role: string;
    content: string;
    timestamp?: string;
    topEmotions?: Array<{ name: string; score: number }>;
  }>;
  fetchedAt: string;
  analysis?: ConversationAnalysis;
}

/**
 * @description OpenAI emergency analysis payload captured from the analyze API.
 */
interface ConversationAnalysis {
  severity?: string;
  severity_score?: number;
  confidence?: number;
  labels?: string[];
  flags?: string[];
  summary?: string;
  incident_type?: string;
  persons_involved?: number;
  immediate_threats?: string[];
  recommended_units?: string[];
  priority_code?: string;
  special_instructions?: string;
  location_mentioned?: string;
  caller_condition?: string;
  analysis_method?: string;
  analyzed_at?: string;
  emotion_analysis?: {
    top_emotions?: Array<{ emotion: string; intensity: number }>;
    distress_level?: number;
    average_intensity?: number;
  };
}

/**
 * @description Options controlling how analyzed calls are persisted and surfaced.
 */
interface PersistOptions {
  chatGroupId: string;
  notifyDashboard: boolean;
  closeModal: boolean;
  showAlert: boolean;
  source: 'conversation_end' | 'manual_fetch';
}

/**
 * @description Result metadata returned after persisting a processed call.
 */
interface PersistResult {
  callId: string;
  isUpdate: boolean;
  analysis?: ConversationAnalysis;
}

export default function StartEmergencyCall({ onCallCreated }: StartEmergencyCallProps) {
  const [open, setOpen] = useState(false);
  const [phoneNumber, setPhoneNumber] = useState('+91 3489270190');
  const [callId, setCallId] = useState<string | null>(null);
  const [isHumeLoading, setIsHumeLoading] = useState(true);
  const [conversationData, setConversationData] = useState<any>({
    transcript: [],
    emotions: [],
    started: false,
    ended: false,
  });
  const conversationDataRef = useRef(conversationData);
  const [isFetchingSummary, setIsFetchingSummary] = useState(false);
  const [isAnalyzingLatest, setIsAnalyzingLatest] = useState(false);
  const [latestSummary, setLatestSummary] = useState<LatestConversationSummary | null>(null);
  const [analysisError, setAnalysisError] = useState<string | null>(null);
  const configId = process.env.NEXT_PUBLIC_HUME_CONFIG_ID;
  const isProcessingLatest = isFetchingSummary || isAnalyzingLatest;

  // Generate unique call ID when dialog opens
  useEffect(() => {
    if (open && !callId) {
      const newCallId = `call_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      setCallId(newCallId);
      logger.info('Hume voice session initialised', { callId: newCallId });
    }
  }, [open, callId]);

  useEffect(() => {
    conversationDataRef.current = conversationData;
  }, [conversationData]);

  /**
   * @description Requests GPT-powered emergency analysis for a Hume conversation.
   */
  const requestConversationAnalysis = useCallback(
    async (chatGroupId: string, resolvedConfigId?: string | null) => {
      logger.info('Requesting AI analysis for conversation', {
        chatGroupId,
        resolvedConfigId,
        phoneNumber,
      });

      const response = await fetch('/api/analyze/conversation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_group_id: chatGroupId,
          config_id: resolvedConfigId,
          phone_number: phoneNumber,
        }),
      });

      const payload = await response.json();

      if (!response.ok || payload.success === false) {
        const errorMessage = payload.error || 'Failed to analyze conversation';
        logger.error('AI analysis request failed', {
          chatGroupId,
          status: response.status,
          error: errorMessage,
        });
        throw new Error(errorMessage);
      }

      logger.info('AI analysis completed', {
        chatGroupId,
        severity: payload.analysis?.severity,
        flags: payload.analysis?.flags,
      });

      return payload;
    },
    [phoneNumber]
  );

  /**
   * @description Applies analysis metadata onto the emergency call record.
   */
  const mergeAnalysisIntoCall = (call: any, analysis?: ConversationAnalysis) => {
    if (!analysis) {
      return { ...call };
    }

    const mergedCall = {
      ...call,
      analysis,
      incident_type: analysis.incident_type || call.incident_type,
      incident_subtype: analysis.incident_type || call.incident_subtype,
      severity: analysis.severity || call.severity,
      severity_score: analysis.severity_score ?? call.severity_score,
      ai_summary: analysis.summary || call.ai_summary,
      ai_confidence: analysis.confidence ?? call.ai_confidence,
      persons_involved: analysis.persons_involved ?? call.persons_involved,
      immediate_threats: analysis.immediate_threats ?? call.immediate_threats,
      priority_code: (analysis.priority_code as any) || call.priority_code,
      caller_condition: analysis.caller_condition || call.caller_condition,
      labels: analysis.labels ?? call.labels,
      flags: analysis.flags ?? call.flags,
      recommended_units: analysis.recommended_units ?? call.recommended_units,
      special_instructions: analysis.special_instructions ?? call.special_instructions,
    };

    if (analysis.location_mentioned && analysis.location_mentioned !== 'Unknown') {
      mergedCall.caller_location = {
        ...(call.caller_location || {}),
        address: analysis.location_mentioned,
      };
    }

    if (analysis.emotion_analysis?.top_emotions?.length) {
      const topEmotion = analysis.emotion_analysis.top_emotions[0];
      if (topEmotion) {
        mergedCall.top_emotion = topEmotion.emotion;
        mergedCall.emotion_intensity = topEmotion.intensity;
      }
    }

    return mergedCall;
  };

  /**
   * @description Persists an analyzed call locally and notifies the dashboard.
   */
  const persistAnalyzedCall = useCallback(
    async (analysisPayload: any, options: PersistOptions): Promise<PersistResult> => {
      const chatGroupId = options.chatGroupId;
      const transcriptSource =
        analysisPayload.transcript && analysisPayload.transcript.length > 0
          ? analysisPayload.transcript
          : conversationDataRef.current?.transcript || [];

      const normalizedTranscript = Array.isArray(transcriptSource)
        ? transcriptSource.map((segment: any) => ({
            text: segment.text || segment.content || '',
            role: segment.role || segment.speaker || 'user',
            timestamp: segment.timestamp || new Date().toISOString(),
            topEmotion: segment.topEmotion || segment.top_emotion,
            emotions: segment.emotions,
          }))
        : [];

      const emotionFrames =
        analysisPayload.raw_hume_data?.emotions?.filter(Boolean) ||
        conversationDataRef.current?.emotions?.filter(Boolean) ||
        [];

      const createResponse = await fetch('/api/calls/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          phoneNumber,
          conversationId: chatGroupId,
          transcript: normalizedTranscript,
          emotions: emotionFrames,
        }),
      });

      const createPayload = await createResponse.json();

      if (!createResponse.ok || createPayload.success === false) {
        const errorMessage = createPayload.error || 'Failed to create call';
        logger.error('Call creation API failed', {
          chatGroupId,
          status: createResponse.status,
          error: errorMessage,
        });
        throw new Error(errorMessage);
      }

      const baseCall = createPayload.call;
      const enrichedCall = mergeAnalysisIntoCall(
        {
          ...baseCall,
          transcript: normalizedTranscript,
          emotion_data: emotionFrames,
          call_status: 'completed',
          status: baseCall.status ?? 'active',
          updated_at: new Date().toISOString(),
        },
        analysisPayload.analysis
      );

      const storedCallsRaw = localStorage.getItem('kwik_emergency_calls');
      let storedCalls: any[] = [];

      if (storedCallsRaw) {
        try {
          const parsed = JSON.parse(storedCallsRaw);
          if (Array.isArray(parsed)) {
            storedCalls = parsed;
          }
        } catch (storageError) {
          logger.warn('Unable to parse stored calls JSON', {
            storageError: storageError instanceof Error ? storageError.message : storageError,
          });
        }
      }

      const existingIndex = storedCalls.findIndex((call) => call.id === enrichedCall.id);
      const isUpdate = existingIndex >= 0;

      if (isUpdate) {
        storedCalls[existingIndex] = { ...storedCalls[existingIndex], ...enrichedCall };
      } else {
        storedCalls = [enrichedCall, ...storedCalls];
      }

      localStorage.setItem('kwik_emergency_calls', JSON.stringify(storedCalls));
      window.dispatchEvent(
        new CustomEvent('kwik-call-updated', {
          detail: { call: enrichedCall, isUpdate },
        })
      );

      logger.info('Emergency call persisted to storage', {
        chatGroupId,
        callId: enrichedCall.id,
        isUpdate,
        source: options.source,
      });

      if (!isUpdate && options.notifyDashboard && onCallCreated) {
        onCallCreated(enrichedCall.id);
      }

      if (options.closeModal) {
        setOpen(false);
      }

      if (options.showAlert) {
        const flagsText =
          enrichedCall.flags && enrichedCall.flags.length > 0
            ? `\n🚨 FLAGS: ${enrichedCall.flags.join(', ')}`
            : '';
        const unitsText =
          enrichedCall.recommended_units && enrichedCall.recommended_units.length > 0
            ? `\n🚒 DISPATCH: ${enrichedCall.recommended_units.slice(0, 2).join(', ')}`
            : '';

        alert(
          `✅ Emergency Call Analyzed!\n\n` +
            `📞 Call ID: ${enrichedCall.id}\n` +
            `🎯 Type: ${enrichedCall.incident_type || 'Unknown'}\n` +
            `⚠️ Severity: ${enrichedCall.severity?.toUpperCase()} (${Math.round(
              enrichedCall.severity_score ?? 0
            )}/100)\n` +
            `😰 Caller: ${enrichedCall.caller_condition}\n` +
            `🏷️ Labels: ${enrichedCall.labels?.slice(0, 3).join(', ') || 'None'}` +
            flagsText +
            unitsText +
            `\n\n✅ Analysis Confidence: ${Math.round(
              (enrichedCall.ai_confidence || 0) * 100
            )}%`
        );
      }

      return {
        callId: enrichedCall.id,
        isUpdate,
        analysis: analysisPayload.analysis,
      };
    },
    [onCallCreated, phoneNumber]
  );

  /**
   * @description Fallback call creation when GPT analysis is unavailable.
   */
  const handleFallbackCallCreation = useCallback(
    async (chatGroupId: string) => {
      logger.warn('Using fallback call creation (analysis unavailable)', { chatGroupId });

      const conversationSnapshot = conversationDataRef.current;
      const transcript = Array.isArray(conversationSnapshot?.transcript)
        ? conversationSnapshot.transcript
        : [];
      const emotions = Array.isArray(conversationSnapshot?.emotions)
        ? conversationSnapshot.emotions.filter((entry: any) => !!entry)
        : [];

      const avgIntensity =
        emotions.length > 0
          ? emotions.reduce((sum: number, emotion: any) => sum + (emotion?.intensity || 0), 0) /
            emotions.length
          : 0.5;

      const topEmotionNames = emotions
        .map((emotion: any) => emotion?.topEmotion)
        .filter(Boolean) as string[];
      const topEmotion =
        topEmotionNames.length > 0
          ? topEmotionNames
              .sort(
                (a, b) =>
                  topEmotionNames.filter((val) => val === a).length -
                  topEmotionNames.filter((val) => val === b).length
              )
              .pop() || 'distress'
          : 'distress';

      try {
        const response = await fetch('/api/calls/create', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            phoneNumber,
            conversationId: chatGroupId,
            transcript,
            emotions,
          }),
        });

        const payload = await response.json();

        if (!response.ok || payload.success === false) {
          throw new Error(payload.error || 'Failed to create call');
        }

        const fallbackCall = {
          ...payload.call,
          transcript,
        };

        const storedCallsRaw = localStorage.getItem('kwik_emergency_calls');
        let storedCalls: any[] = [];

        if (storedCallsRaw) {
          try {
            const parsed = JSON.parse(storedCallsRaw);
            if (Array.isArray(parsed)) {
              storedCalls = parsed;
            }
          } catch (storageError) {
            logger.warn('Unable to parse stored calls JSON', {
              storageError: storageError instanceof Error ? storageError.message : storageError,
            });
          }
        }

        const existingIndex = storedCalls.findIndex((call) => call.id === fallbackCall.id);
        const isUpdate = existingIndex >= 0;

        if (isUpdate) {
          storedCalls[existingIndex] = { ...storedCalls[existingIndex], ...fallbackCall };
        } else {
          storedCalls = [fallbackCall, ...storedCalls];
        }

        localStorage.setItem('kwik_emergency_calls', JSON.stringify(storedCalls));
        window.dispatchEvent(
          new CustomEvent('kwik-call-updated', {
            detail: { call: fallbackCall, isUpdate },
          })
        );

        setOpen(false);
        if (onCallCreated) {
          onCallCreated(fallbackCall.id);
        }

        alert(
          `✅ Emergency call created!\n\nCall ID: ${fallbackCall.id}\n\nEmotion: ${topEmotion} (${Math.round(
            avgIntensity * 100
          )}%)\n\n⚠️ Using basic analysis - configure Hume API for full analysis.`
        );
      } catch (error) {
        logger.error('Fallback call creation failed', {
          chatGroupId,
          error: error instanceof Error ? error.message : error,
        });
        alert('⚠️ Failed to create call. Please try again.');
      }
    },
    [onCallCreated, phoneNumber]
  );

  /**
   * @description Handles Hume's `conversation:ended` event by invoking GPT analysis.
   */
  const handleConversationEnd = useCallback(
    async (humeData: any) => {
      if (!callId) {
        logger.warn('Conversation end event received without callId');
        return;
      }

      const chatGroupId =
        humeData?.chat_group_id || humeData?.conversation_id || humeData?.id || callId;
      const resolvedConfigId = configId || humeData?.config_id;

      logger.info('Processing conversation end workflow', {
        callId,
        chatGroupId,
        resolvedConfigId,
      });

      try {
        const analysisPayload = await requestConversationAnalysis(chatGroupId, resolvedConfigId);
        await persistAnalyzedCall(analysisPayload, {
          chatGroupId,
          notifyDashboard: true,
          closeModal: true,
          showAlert: true,
          source: 'conversation_end',
        });
      } catch (error) {
        logger.error('Conversation analysis failed, falling back to local data', {
          callId,
          chatGroupId,
          error: error instanceof Error ? error.message : error,
        });
        await handleFallbackCallCreation(chatGroupId);
      }
    },
    [callId, configId, handleFallbackCallCreation, persistAnalyzedCall, requestConversationAnalysis]
  );

  // Listen for Hume postMessage events
  useEffect(() => {
    const handleHumeMessage = (event: MessageEvent) => {
      if (!event.origin.includes('hume.ai')) {
        return;
      }

      const payload = event.data ?? {};
      const { type, data } = payload;

      logger.verbose('Received Hume postMessage', { type, callId });

      switch (type) {
        case 'evi:conversation:started':
          logger.info('Hume conversation started', { callId });
          setConversationData((prev: any) => ({ ...prev, started: true }));
          setIsHumeLoading(false);
          break;

        case 'evi:message:user':
          logger.debug('Captured caller utterance', {
            callId,
            textPreview: data?.text?.slice(0, 60),
          });
          setConversationData((prev: any) => ({
            ...prev,
            transcript: [
              ...prev.transcript,
              {
                speaker: 'user',
                text: data?.text,
                emotions: data?.emotions,
                timestamp: new Date().toISOString(),
              },
            ],
            emotions: [...prev.emotions, data?.emotions],
          }));
          break;

        case 'evi:message:assistant':
          logger.debug('Captured assistant response', {
            callId,
            textPreview: data?.text?.slice(0, 60),
          });
          setConversationData((prev: any) => ({
            ...prev,
            transcript: [
              ...prev.transcript,
              {
                speaker: 'assistant',
                text: data?.text,
                timestamp: new Date().toISOString(),
              },
            ],
          }));
          break;

        case 'evi:emotion:update':
          logger.debug('Emotion frame received', {
            callId,
            topEmotion: data?.topEmotion,
            intensity: data?.intensity,
          });
          setConversationData((prev: any) => ({
            ...prev,
            emotions: [...prev.emotions, data],
          }));
          break;

        case 'evi:conversation:ended':
          logger.info('Hume conversation ended', { callId });
          setConversationData((prev: any) => ({ ...prev, ended: true }));
          handleConversationEnd(data);
          break;

        default:
          logger.debug('Unhandled Hume message type', { type });
      }
    };

    window.addEventListener('message', handleHumeMessage);
    return () => window.removeEventListener('message', handleHumeMessage);
  }, [callId, handleConversationEnd]);

  /**
   * @description Fetch latest chat history from Hume (mirrors test-hume-config.js workflow).
   */
  const handleFetchLatestConversation = async () => {
    if (!configId) {
      alert('Missing Hume config ID. Please set NEXT_PUBLIC_HUME_CONFIG_ID.');
      return;
    }

    setIsFetchingSummary(true);
    setIsAnalyzingLatest(false);
    setAnalysisError(null);

    logger.info('Fetching latest Hume conversation snapshot', { configId });

    try {
      const response = await fetch(
        `/api/hume/chat-summary?config_id=${encodeURIComponent(configId)}`
      );
      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.error || 'Failed to fetch chat summary');
      }

      if (data.config) {
        logger.info('Hume config metadata loaded', {
          name: data.config.name,
          created: data.config.created_on,
          version: data.config.version,
        });
      } else {
        logger.warn('Hume config metadata unavailable');
      }

      logger.info('Chat groups retrieved', {
        chatGroupCount: data.chatGroups?.length ?? 0,
      });

      const latestChat = data.latestChat;
      if (!latestChat?.id) {
        logger.info('No recent Hume conversations detected');
        setLatestSummary(null);
        return;
      }

      const events: Array<any> = data.latestEvents ?? [];
      logger.info('Latest Hume conversation events retrieved', {
        chatGroupId: latestChat.id,
        eventCount: events.length,
      });

      const messages: LatestConversationSummary['messages'] = [];

      events.forEach((event: any, index: number) => {
        if (event.type === 'USER_MESSAGE' || event.type === 'AGENT_MESSAGE') {
          const role = event.type === 'USER_MESSAGE' ? 'USER' : 'ASSISTANT';
          const content =
            event.message_text ||
            event.text ||
            event.message?.content ||
            (Array.isArray(event.message?.segments)
              ? event.message.segments.map((segment: any) => segment?.text).join(' ')
              : '') ||
            'No content provided';

          let topEmotions: Array<{ name: string; score: number }> | undefined;
          if (event.emotions && Array.isArray(event.emotions)) {
            topEmotions = event.emotions.slice(0, 3).map((emotion: any) => ({
              name: emotion.name,
              score: emotion.score,
            }));
          } else if (event.models?.prosody?.scores) {
            topEmotions = Object.entries(event.models.prosody.scores)
              .sort(([, a], [, b]) => (b as number) - (a as number))
              .slice(0, 3)
              .map(([name, score]) => ({
                name,
                score: typeof score === 'number' ? score : Number(score),
              }));
          } else if (event.emotion_features) {
            try {
              const parsed = JSON.parse(event.emotion_features);
              topEmotions = Object.entries(parsed)
                .sort(([, a], [, b]) => (b as number) - (a as number))
                .slice(0, 3)
                .map(([name, score]) => ({
                  name,
                  score: typeof score === 'number' ? score : Number(score),
                }));
            } catch (err) {
              logger.warn('Unable to parse emotion_features JSON', { index, err });
            }
          }

          const timestampValue =
            typeof event.timestamp === 'number'
              ? new Date(event.timestamp).toISOString()
              : typeof event.timestamp === 'string'
              ? new Date(event.timestamp).toISOString()
              : event.created_on
              ? new Date(event.created_on).toISOString()
              : new Date().toISOString();

          messages.push({
            role,
            content,
            timestamp: timestampValue,
            topEmotions,
          });
        }
      });

      const orderedMessages = messages.sort((a, b) => {
        const timeA = new Date(a.timestamp ?? '').getTime();
        const timeB = new Date(b.timestamp ?? '').getTime();
        return timeA - timeB;
      });

      setLatestSummary({
        chatGroupId: latestChat.id,
        messages: orderedMessages,
        fetchedAt: data.fetchedAt,
      });

      logger.info('Latest Hume transcript cached in state', {
        chatGroupId: latestChat.id,
        messageCount: orderedMessages.length,
      });

      setIsAnalyzingLatest(true);

      try {
        const analysisPayload = await requestConversationAnalysis(latestChat.id, configId);
        await persistAnalyzedCall(analysisPayload, {
          chatGroupId: latestChat.id,
          notifyDashboard: true,
          closeModal: false,
          showAlert: false,
          source: 'manual_fetch',
        });

        setLatestSummary((prev) => {
          if (!prev || prev.chatGroupId !== latestChat.id) {
            return prev;
          }
          return {
            ...prev,
            analysis: analysisPayload.analysis,
          };
        });

        logger.info('Manual GPT analysis complete', {
          chatGroupId: latestChat.id,
          severity: analysisPayload.analysis?.severity,
        });
      } catch (analysisError) {
        const message =
          analysisError instanceof Error ? analysisError.message : 'Failed to analyze conversation';
        setAnalysisError(message);
        logger.error('Manual conversation analysis failed', {
          chatGroupId: latestChat.id,
          error: message,
        });
      } finally {
        setIsAnalyzingLatest(false);
      }
    } catch (error) {
      logger.error('Failed to fetch latest Hume conversation', {
        error: error instanceof Error ? error.message : error,
      });
      alert(
        `Unable to fetch conversation data: ${
          error instanceof Error ? error.message : 'Unknown error'
        }`
      );
    } finally {
      setIsFetchingSummary(false);
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
                  onClick={handleFetchLatestConversation}
                  disabled={isProcessingLatest}
                  className="text-gray-400 hover:text-white flex items-center gap-2"
                >
                  {isProcessingLatest ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      {isFetchingSummary ? 'Fetching...' : 'Analyzing...'}
                    </>
                  ) : (
                    'Fetch Latest Data'
                  )}
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
                  src="https://hume-2.vercel.app/"
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

              {latestSummary && (
                <div className="bg-gray-800 rounded-lg p-4 border border-gray-700">
                  <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
                    <span>🗂️</span>
                    Latest Hume Conversation Snapshot
                  </h3>
                  <p className="text-xs text-gray-400 mb-3">
                    Chat Group ID: <span className="font-mono">{latestSummary.chatGroupId}</span> • Retrieved at{' '}
                    {new Date(latestSummary.fetchedAt).toLocaleTimeString()}
                  </p>
                  {isAnalyzingLatest && (
                    <div className="mb-3 flex items-center gap-2 text-xs text-blue-300">
                      <Loader2 className="w-3 h-3 animate-spin" />
                      Running GPT triage analysis...
                    </div>
                  )}
                  {analysisError && (
                    <div className="mb-3 rounded-md border border-red-700 bg-red-900/20 px-3 py-2 text-xs text-red-300">
                      {analysisError}
                    </div>
                  )}
                  {latestSummary.analysis && (
                    <div className="mb-3 space-y-2 rounded-md border border-gray-700 bg-gray-900/70 p-3 text-xs text-gray-300">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="uppercase tracking-wide text-gray-400">AI Assessment</span>
                        <span className="rounded-full bg-red-600/20 px-2 py-0.5 text-[11px] text-red-300">
                          Severity: {latestSummary.analysis.severity?.toUpperCase() ?? 'UNKNOWN'} (
                          {Math.round(latestSummary.analysis.severity_score ?? 0)}/100)
                        </span>
                        {latestSummary.analysis.priority_code && (
                          <span className="rounded-full bg-blue-600/20 px-2 py-0.5 text-[11px] text-blue-200">
                            {latestSummary.analysis.priority_code}
                          </span>
                        )}
                      </div>
                      {latestSummary.analysis.summary && (
                        <p className="text-sm text-gray-200">{latestSummary.analysis.summary}</p>
                      )}
                      {latestSummary.analysis.flags && latestSummary.analysis.flags.length > 0 && (
                        <div className="flex flex-wrap gap-2">
                          {latestSummary.analysis.flags.map((flag) => (
                            <span
                              key={flag}
                              className="rounded-full border border-red-600/40 bg-red-600/10 px-2 py-1 text-[11px] text-red-300"
                            >
                              {flag}
                            </span>
                          ))}
                        </div>
                      )}
                      {latestSummary.analysis.recommended_units &&
                        latestSummary.analysis.recommended_units.length > 0 && (
                          <div className="text-[11px] text-gray-400">
                            Units: {latestSummary.analysis.recommended_units.slice(0, 3).join(', ')}
                          </div>
                        )}
                      {latestSummary.analysis.emotion_analysis?.top_emotions &&
                        latestSummary.analysis.emotion_analysis.top_emotions.length > 0 && (
                          <div className="flex flex-wrap gap-2 text-[11px] text-yellow-200">
                            {latestSummary.analysis.emotion_analysis.top_emotions
                              .slice(0, 3)
                              .map((emotion) => (
                                <span
                                  key={emotion.emotion}
                                  className="rounded-full bg-yellow-500/10 px-2 py-1 text-[11px] text-yellow-200"
                                >
                                  {emotion.emotion}: {Math.round((emotion.intensity ?? 0) * 100)}%
                                </span>
                              ))}
                          </div>
                        )}
                    </div>
                  )}
                  <div className="space-y-3 max-h-48 overflow-y-auto pr-2">
                    {latestSummary.messages.length > 0 ? (
                      latestSummary.messages
                        .slice(0, 6)
                        .map((message, index) => (
                          <div
                            key={`${message.role}-${index}-${message.timestamp}`}
                            className="bg-gray-900/60 border border-gray-700 rounded-md p-3"
                          >
                            <div className="flex justify-between text-xs text-gray-400 mb-1">
                              <span className="uppercase tracking-wide font-semibold text-gray-300">
                                {message.role}
                              </span>
                              <span>
                                {message.timestamp
                                  ? new Date(message.timestamp).toLocaleTimeString()
                                  : '—'}
                              </span>
                            </div>
                            <p className="text-sm text-gray-200 whitespace-pre-line">
                              {message.content}
                            </p>
                            {message.topEmotions && message.topEmotions.length > 0 && (
                              <div className="mt-2 flex flex-wrap gap-2 text-xs">
                                {message.topEmotions.map((emotion) => (
                                  <span
                                    key={`${message.timestamp}-${emotion.name}`}
                                    className="bg-gray-800/80 border border-gray-700 rounded-full px-2 py-1 text-gray-200"
                                  >
                                    {emotion.name} {Math.round(emotion.score * 100)}%
                                  </span>
                                ))}
                              </div>
                            )}
                          </div>
                        ))
                    ) : (
                      <p className="text-xs text-gray-400">
                        No transcript recorded for the latest conversation.
                      </p>
                    )}
                  </div>
                  {latestSummary.messages.length > 6 && (
                    <p className="text-[11px] text-gray-500 mt-2">
                      Showing the 6 most recent messages of {latestSummary.messages.length} total.
                    </p>
                  )}
                  <div className="mt-3 text-[11px] text-gray-500">
                    {latestSummary.analysis?.analysis_method
                      ? `AI Method: ${latestSummary.analysis.analysis_method}`
                      : 'View full logs in console for the complete transcript and emotion scores.'}
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

