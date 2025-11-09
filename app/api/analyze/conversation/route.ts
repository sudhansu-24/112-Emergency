/**
 * Conversation Analysis API Route
 * Fetches Hume chat history and analyzes it with GPT-4
 * Provides emergency labels, severity flags, and recommendations
 */

import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { chat_group_id, config_id, phone_number } = body;

    if (!chat_group_id) {
      return NextResponse.json(
        { error: 'chat_group_id is required' },
        { status: 400 }
      );
    }

    console.log('🔍 Analyzing conversation:', {
      chatGroupId: chat_group_id,
      configId: config_id,
      phoneNumber: phone_number
    });

    // Step 1: Fetch Hume chat events
    const humeResponse = await fetch(
      `${request.nextUrl.origin}/api/hume/chat-events?chat_group_id=${chat_group_id}${config_id ? `&config_id=${config_id}` : ''}`,
      { method: 'GET' }
    );

    if (!humeResponse.ok) {
      const error = await humeResponse.json();
      console.error('❌ Failed to fetch Hume chat events:', error);
      return NextResponse.json(
        { error: 'Failed to fetch conversation data', details: error },
        { status: humeResponse.status }
      );
    }

    const humeData = await humeResponse.json();
    console.log('✅ Hume data retrieved:', {
      transcriptLength: humeData.transcript?.length || 0,
      emotionCount: humeData.emotions?.length || 0
    });

    // If no transcript, return early
    if (!humeData.transcript || humeData.transcript.length === 0) {
      return NextResponse.json({
        success: true,
        chat_group_id,
        analysis: {
          labels: ['NO_TRANSCRIPT'],
          severity: 'low',
          severity_score: 0,
          confidence: 0,
          summary: 'No conversation transcript available',
          flags: [],
          recommendations: ['Unable to analyze - no transcript data']
        },
        hume_data: humeData
      });
    }

    // Step 2: Build full conversation transcript for GPT
    const conversationText = humeData.transcript
      .map((msg: any) => `${msg.role.toUpperCase()}: ${msg.text}`)
      .join('\n');

    console.log('📝 Conversation transcript:', {
      length: conversationText.length,
      messageCount: humeData.transcript.length
    });

    // Step 3: Analyze with GPT-4
    const openaiKey = process.env.OPENAI_API_KEY;
    
    if (!openaiKey) {
      console.warn('⚠️ OPENAI_API_KEY not configured, using emotion-based analysis only');
      return NextResponse.json({
        success: true,
        chat_group_id,
        analysis: createEmotionBasedAnalysis(humeData),
        hume_data: humeData
      });
    }

    const openai = new OpenAI({ apiKey: openaiKey });

    const gptResponse = await openai.chat.completions.create({
      model: 'gpt-4-turbo-preview',
      temperature: 0.3,
      response_format: { type: 'json_object' },
      messages: [
        {
          role: 'system',
          content: `You are an expert emergency dispatcher AI analyzing 112 calls. 

Your task is to analyze the conversation transcript and emotion data, then provide:
1. LABELS - Emergency category labels (e.g., MEDICAL_EMERGENCY, FIRE, ACCIDENT, VIOLENCE, etc.)
2. SEVERITY - Overall severity level (critical/high/medium/low)
3. SEVERITY_SCORE - Numeric score 0-100
4. CONFIDENCE - How confident you are in the analysis (0-1)
5. FLAGS - Critical flags (e.g., LIFE_THREATENING, WEAPONS_INVOLVED, CHILDREN_AT_RISK, etc.)
6. SUMMARY - Brief summary of the emergency
7. INCIDENT_TYPE - Specific type (e.g., "house fire", "chest pain", "car accident")
8. PERSONS_INVOLVED - Number of people affected
9. IMMEDIATE_THREATS - List of immediate dangers
10. RECOMMENDED_UNITS - Emergency units to dispatch (e.g., ["Fire Engine 7", "Ambulance 12"])
11. PRIORITY_CODE - Code 3 (lights/sirens), Code 2 (urgent), or Code 1 (routine)
12. SPECIAL_INSTRUCTIONS - Any special instructions for responders
13. LOCATION_MENTIONED - Any location info from transcript
14. CALLER_CONDITION - Caller's state (calm/distressed/panicked/injured)

Respond ONLY with valid JSON matching this structure:
{
  "labels": ["LABEL1", "LABEL2"],
  "severity": "critical|high|medium|low",
  "severity_score": 85,
  "confidence": 0.92,
  "flags": ["FLAG1", "FLAG2"],
  "summary": "Brief emergency summary",
  "incident_type": "specific incident type",
  "persons_involved": 2,
  "immediate_threats": ["threat1", "threat2"],
  "recommended_units": ["unit1", "unit2"],
  "priority_code": "Code 3",
  "special_instructions": "instructions",
  "location_mentioned": "address or landmarks",
  "caller_condition": "distressed"
}`
        },
        {
          role: 'user',
          content: `Analyze this emergency call:

CONVERSATION TRANSCRIPT:
${conversationText}

EMOTION DATA:
- Top Emotions: ${humeData.emotion_stats?.top_emotions?.slice(0, 5).map((e: any) => `${e.emotion}: ${(e.intensity * 100).toFixed(1)}%`).join(', ')}
- Distress Level: ${(humeData.emotion_stats?.distress_level || 0).toFixed(1)}%
- Average Intensity: ${((humeData.emotion_stats?.average_intensity || 0) * 100).toFixed(1)}%

Provide comprehensive emergency analysis in JSON format.`
        }
      ]
    });

    const gptContent = gptResponse.choices[0]?.message?.content;
    
    if (!gptContent) {
      throw new Error('No response from GPT-4');
    }

    const gptAnalysis = JSON.parse(gptContent);
    console.log('✅ GPT analysis complete:', {
      severity: gptAnalysis.severity,
      labels: gptAnalysis.labels?.length || 0,
      flags: gptAnalysis.flags?.length || 0
    });

    // Step 4: Combine GPT analysis with emotion data
    const finalAnalysis = {
      ...gptAnalysis,
      // Boost severity if emotions are extreme
      severity_score: Math.min(
        gptAnalysis.severity_score + (humeData.emotion_stats?.distress_level || 0) * 0.2,
        100
      ),
      emotion_analysis: {
        top_emotions: humeData.emotion_stats?.top_emotions || [],
        distress_level: humeData.emotion_stats?.distress_level || 0,
        average_intensity: humeData.emotion_stats?.average_intensity || 0
      },
      analyzed_at: new Date().toISOString(),
      analysis_method: 'GPT-4 + Hume Emotion Detection'
    };

    // Recalculate severity level based on boosted score
    const boostedScore = finalAnalysis.severity_score;
    finalAnalysis.severity = 
      boostedScore >= 80 ? 'critical' :
      boostedScore >= 60 ? 'high' :
      boostedScore >= 40 ? 'medium' : 'low';

    console.log('🎯 Final analysis:', {
      severity: finalAnalysis.severity,
      severityScore: finalAnalysis.severity_score,
      labels: finalAnalysis.labels,
      flags: finalAnalysis.flags
    });

    return NextResponse.json({
      success: true,
      chat_group_id,
      config_id,
      analysis: finalAnalysis,
      transcript: humeData.transcript,
      raw_hume_data: humeData
    });

  } catch (error) {
    console.error('❌ Error analyzing conversation:', error);
    return NextResponse.json(
      { 
        error: 'Failed to analyze conversation',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

/**
 * Create analysis based on emotion data only (fallback when GPT not available)
 */
function createEmotionBasedAnalysis(humeData: any) {
  const distressLevel = humeData.emotion_stats?.distress_level || 0;
  const topEmotions = humeData.emotion_stats?.top_emotions || [];

  // Determine labels based on top emotions
  const labels: string[] = ['EMERGENCY_CALL'];
  const flags: string[] = [];

  topEmotions.slice(0, 3).forEach((e: any) => {
    if (e.emotion === 'fear' && e.intensity > 0.6) {
      labels.push('HIGH_FEAR');
      flags.push('CALLER_AFRAID');
    }
    if (e.emotion === 'distress' && e.intensity > 0.6) {
      labels.push('CALLER_DISTRESSED');
      flags.push('HIGH_DISTRESS');
    }
    if (e.emotion === 'anger' && e.intensity > 0.6) {
      labels.push('POTENTIAL_VIOLENCE');
      flags.push('ANGER_DETECTED');
    }
  });

  const severity = 
    distressLevel >= 70 ? 'critical' :
    distressLevel >= 50 ? 'high' :
    distressLevel >= 30 ? 'medium' : 'low';

  return {
    labels,
    severity,
    severity_score: distressLevel,
    confidence: 0.65,
    flags,
    summary: 'Emergency call detected. GPT analysis unavailable - using emotion-based assessment.',
    incident_type: 'emergency',
    persons_involved: 1,
    immediate_threats: flags,
    recommended_units: ['Emergency Services'],
    priority_code: severity === 'critical' ? 'Code 3' : 'Code 2',
    special_instructions: 'Analyze transcript manually for details',
    location_mentioned: 'Unknown',
    caller_condition: 
      distressLevel >= 70 ? 'panicked' :
      distressLevel >= 50 ? 'distressed' :
      distressLevel >= 30 ? 'concerned' : 'calm',
    emotion_analysis: {
      top_emotions: topEmotions,
      distress_level: distressLevel,
      average_intensity: humeData.emotion_stats?.average_intensity || 0
    },
    analyzed_at: new Date().toISOString(),
    analysis_method: 'Emotion-based (GPT unavailable)'
  };
}

