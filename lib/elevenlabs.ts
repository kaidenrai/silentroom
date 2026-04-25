const ELEVENLABS_API_KEY = process.env.ELEVENLABS_API_KEY || "";
const ELEVENLABS_BASE_URL = "https://api.elevenlabs.io/v1";

export interface TranscriptionResult {
  text: string;
  confidence?: number;
}

export interface TTSOptions {
  voiceId?: string;
  stability?: number;
  similarityBoost?: number;
}

/**
 * Transcribe audio blob to text using ElevenLabs STT
 */
export async function transcribeAudio(audioBlob: Blob): Promise<TranscriptionResult> {
  const formData = new FormData();
  formData.append("file", audioBlob, "audio.webm");
  formData.append("model_id", "scribe_v1");

  try {
    const response = await fetch(`${ELEVENLABS_BASE_URL}/speech-to-text`, {
      method: "POST",
      headers: {
        "xi-api-key": ELEVENLABS_API_KEY,
      },
      body: formData,
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`ElevenLabs transcription failed: ${errorText}`);
    }

    const data = await response.json();
    return {
      text: data.text || "",
      confidence: data.confidence,
    };
  } catch (error) {
    console.error("Transcription error:", error);
    throw error;
  }
}

/**
 * Convert text to speech using ElevenLabs TTS
 */
export async function textToSpeech(
  text: string,
  voiceId: string = "21m00Tcm4TlvDq8ikWAM",
  options?: TTSOptions
): Promise<Blob> {
  const requestBody = {
    text,
    model_id: "eleven_monolingual_v1",
    voice_settings: {
      stability: options?.stability ?? 0.5,
      similarity_boost: options?.similarityBoost ?? 0.75,
    },
  };

  try {
    const response = await fetch(`${ELEVENLABS_BASE_URL}/text-to-speech/${voiceId}`, {
      method: "POST",
      headers: {
        "xi-api-key": ELEVENLABS_API_KEY,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
      throw new Error(`ElevenLabs TTS failed: ${response.statusText}`);
    }

    return await response.blob();
  } catch (error) {
    console.error("TTS error:", error);
    throw error;
  }
}

/**
 * Get available voices from ElevenLabs
 */
export async function getAvailableVoices(): Promise<Array<{ voice_id: string; name: string }>> {
  try {
    const response = await fetch(`${ELEVENLABS_BASE_URL}/voices`, {
      method: "GET",
      headers: {
        "xi-api-key": ELEVENLABS_API_KEY,
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch voices: ${response.statusText}`);
    }

    const data = await response.json();
    return data.voices || [];
  } catch (error) {
    console.error("Error fetching voices:", error);
    return [];
  }
}
