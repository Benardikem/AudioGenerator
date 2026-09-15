import express from "express";
import path from "path";
import dotenv from "dotenv";
import { GoogleGenAI, Modality } from "@google/genai";
import { createServer as createViteServer } from "vite";

dotenv.config();

const app = express();
const PORT = 3000;

app.use(express.json({ limit: "10mb" }));

let aiClient: GoogleGenAI | null = null;
function getGeminiClient(): GoogleGenAI {
  if (!aiClient) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error("GEMINI_API_KEY environment variable is missing.");
    }
    aiClient = new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          "User-Agent": "aistudio-build",
        },
      },
    });
  }
  return aiClient;
}

/**
 * Converts 16-bit Mono PCM audio buffer into a playable WAV file with standard RIFF header.
 * Gemini 3.1 Flash TTS returns 24,000Hz 16-bit mono raw audio.
 */
function pcmToWav(
  pcmBuffer: Buffer,
  sampleRate = 24000,
  numChannels = 1,
  bitDepth = 16
): Buffer {
  if (pcmBuffer.length >= 12 && pcmBuffer.toString("ascii", 0, 4) === "RIFF") {
    return pcmBuffer;
  }

  const byteRate = (sampleRate * numChannels * bitDepth) / 8;
  const blockAlign = (numChannels * bitDepth) / 8;
  const dataSize = pcmBuffer.length;
  const chunkSize = 36 + dataSize;

  const header = Buffer.alloc(44);
  header.write("RIFF", 0);
  header.writeUInt32LE(chunkSize, 4);
  header.write("WAVE", 8);
  header.write("fmt ", 12);
  header.writeUInt32LE(16, 16);
  header.writeUInt16LE(1, 20); // AudioFormat: 1 = PCM
  header.writeUInt16LE(numChannels, 22);
  header.writeUInt32LE(sampleRate, 24);
  header.writeUInt32LE(byteRate, 28);
  header.writeUInt16LE(blockAlign, 32);
  header.writeUInt16LE(bitDepth, 34);
  header.write("data", 36);
  header.writeUInt32LE(dataSize, 40);

  return Buffer.concat([header, pcmBuffer]);
}

// Health check endpoint
app.get("/api/health", (_req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

// Commercial audio generation using Gemini 3.1 Flash TTS
app.post("/api/generate-commercial-audio", async (req, res) => {
  try {
    const { script, voice = "Fenrir", style = "creator_pov", timbre = "baritone" } = req.body;

    if (!script || typeof script !== "string" || !script.trim()) {
      return res.status(400).json({ error: "Commercial script is required." });
    }

    const ai = getGeminiClient();

    // Timbre & Pitch direction to ensure a true masculine baritone/bass sound
    let vocalTimbreDirection = "";
    if (timbre === "bass") {
      vocalTimbreDirection = "[Vocal Delivery: Deliver in an exceptionally deep, rumbling masculine bass voice with heavy chest resonance, low pitch, and commanding presence.]\n";
    } else if (timbre === "baritone") {
      vocalTimbreDirection = "[Vocal Delivery: Deliver in a deep, rich masculine baritone voice with warm low-pitch resonance and natural authority.]\n";
    }

    // Style prompt directive instructing the TTS system to capture the right pacing
    let styleDirection = "";
    switch (style) {
      case "pidgin_warm":
      case "pidgin_advert":
        styleDirection = "Speak in a warm, natural Nigerian Pidgin English voiceover. Mature masculine tone, conversational, calm, friendly, not shouting, not radio announcer hype. Pronounce 'Legit Africa' clearly and 'Legit Africa dot com'. Authentic Lagos everyday pacing with natural breathing pauses between lines:";
        break;
      case "creator_pov":
        styleDirection = "Speak in an intimate, authentic, natural social media creator voice like on TikTok or Instagram Reels. Talk directly to the camera like a real person sharing honest advice with a friend. No sales pitch, no radio announcer hype, just genuine conversational pacing:";
        break;
      case "storytime":
        styleDirection = "Speak like a relatable social media storyteller sharing an eye-opening true story. Calm, captivating, grounded, and engaging without shouting. Natural storytelling cadence:";
        break;
      case "cinematic":
      case "cinematic_broll":
        styleDirection = "Speak with a soft, reflective, measured voiceover cadence. Warm, thoughtful, and subtle, designed specifically to sit as background audio underneath cinematic video footage:";
        break;
      case "social_warning":
        styleDirection = "Speak with a calm, serious, eye-opening consumer advisory tone. Protective, sincere, and trustworthy without exaggerated drama:";
        break;
      case "punchy":
        styleDirection = "Speak with high energy, punchy broadcast cadence, and crisp punchlines for a fast-paced radio promo:";
        break;
      case "advocate":
        styleDirection = "Speak with warmth, sincere authority, trust, and relatable storytelling like a reliable consumer advocate:";
        break;
      case "dramatic":
        styleDirection = "Speak with dramatic, captivating pacing, thoughtful pauses, and resonant conviction:";
        break;
      case "commercial":
        styleDirection = "Speak in a dynamic, articulate, confident radio commercial announcer voice with natural persuasive pauses:";
        break;
      default:
        styleDirection = "Speak warmly and naturally like an authentic creator sharing real advice to play underneath a social media video:";
        break;
    }

    const promptText = `${vocalTimbreDirection}${styleDirection}\n\n${script.trim()}`;

    const validVoice = ["Fenrir", "Charon", "Puck", "Kore", "Zephyr", "Aoede"].includes(voice)
      ? voice
      : "Fenrir";

    const response = await ai.models.generateContent({
      model: "gemini-3.1-flash-tts-preview",
      contents: [{ parts: [{ text: promptText }] }],
      config: {
        responseModalities: [Modality.AUDIO],
        speechConfig: {
          voiceConfig: {
            prebuiltVoiceConfig: { voiceName: validVoice },
          },
        },
      },
    });

    let rawAudioBase64: string | undefined;
    for (const part of response.candidates?.[0]?.content?.parts || []) {
      if (part.inlineData?.data) {
        rawAudioBase64 = part.inlineData.data;
        break;
      }
    }

    if (!rawAudioBase64) {
      return res.status(500).json({
        error: "No audio data was returned by the voice generation model. Please try again.",
      });
    }

    const rawBuffer = Buffer.from(rawAudioBase64, "base64");

    // Sample rate tuning for pitch control:
    // 24000 = standard pitch
    // 21800 = ~-1.8 semitones, produces rich deep masculine baritone
    // 20400 = ~-3.2 semitones, produces heavy commanding bass
    let outputSampleRate = 24000;
    if (timbre === "baritone") {
      outputSampleRate = 21800;
    } else if (timbre === "bass") {
      outputSampleRate = 20400;
    }

    const wavBuffer = pcmToWav(rawBuffer, outputSampleRate, 1, 16);
    const wavBase64 = wavBuffer.toString("base64");

    const durationSeconds = rawBuffer.length / (outputSampleRate * 2);

    res.json({
      audioUrl: `data:audio/wav;base64,${wavBase64}`,
      duration: Math.round(durationSeconds * 10) / 10,
      voice: validVoice,
      style,
      timbre,
      script: script.trim(),
    });
  } catch (error: any) {
    console.error("Audio generation error:", error);
    res.status(500).json({
      error: error?.message || "Failed to generate commercial audio.",
    });
  }
});

// Polish or rewrite commercial script variations
app.post("/api/polish-script", async (req, res) => {
  try {
    const { originalScript, targetStyle = "radio_30s" } = req.body;

    if (!originalScript || typeof originalScript !== "string") {
      return res.status(400).json({ error: "Original script is required." });
    }

    const ai = getGeminiClient();

    let styleInstruction = "";
    switch (targetStyle) {
      case "social_reels":
        styleInstruction = "Adapt this into an authentic, engaging TikTok/Reels video voiceover script. It must sound like a real person talking to their phone camera, not an advertisement. Hook the viewer immediately, tell the story of the tailor or seller, and introduce Legit Africa naturally.";
        break;
      case "storytime_pov":
        styleInstruction = "Format this as an intimate, compelling 'Storytime' voiceover for video B-roll. Start with a relatable scenario ('Let me tell you why this matters...'), explain the dilemma with unvetted vendors, and end with the free solution on Legit Africa.";
        break;
      case "cinematic_voiceover":
        styleInstruction = "Refine this into a thoughtful, minimalist documentary voiceover designed to sit underneath video footage with generous breathing space between short lines.";
        break;
      case "punchy_15s":
        styleInstruction = "Condense this script into a high-impact 15-second social video bumper. Keep 'Legit Africa' and the core hook clear.";
        break;
      case "extended_60s":
        styleInstruction = "Expand this into a 60-second social video narrative with relatable African everyday merchant experiences (tailors, tech sellers, online vendors) emphasizing customer protection and honest reviews on Legit Africa.";
        break;
      case "pidgin_blend":
        styleInstruction = "Adapt this into an authentic, catchy, energetic Nigerian/West African Pidgin English social video voiceover that resonates deeply with everyday online buyers while keeping it clear and trustworthy. Keep 'Legit Africa dot com. E free!'";
        break;
      case "urgent_alert":
        styleInstruction = "Frame this as a serious, eye-opening consumer alert for social media video to stop buyers from sending money to unverified sellers.";
        break;
      case "radio_30s":
      default:
        styleInstruction = "Refine and optimize this into a crisp, perfectly timed 30-second commercial script with rhythmic line breaks.";
        break;
    }

    const prompt = `You are an expert social media video creator and voiceover director for "Legit Africa" (a consumer review platform where buyers search businesses, share honest good or bad reviews, and businesses cannot pay to remove reviews).

${styleInstruction}

Original script:
"""
${originalScript}
"""

Return ONLY the final spoken voiceover script. Do not include sound effects in brackets like [Music plays], do not include stage directions, speaker names, or meta commentary. Return clean, ready-to-speak text formatted in short readable lines.`;

    const response = await ai.models.generateContent({
      model: "gemini-3.8-flash",
      contents: prompt,
    });

    const polishedScript = response.text?.trim() || originalScript;
    res.json({ script: polishedScript });
  } catch (error: any) {
    console.error("Polish script error:", error);
    res.status(500).json({ error: error?.message || "Failed to polish script." });
  }
});

// Start server with Vite middleware in dev or static serving in production
async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (_req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Legit Africa Studio Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
