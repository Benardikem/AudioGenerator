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
    const { script, voice = "Kore", style = "commercial" } = req.body;

    if (!script || typeof script !== "string" || !script.trim()) {
      return res.status(400).json({ error: "Commercial script is required." });
    }

    const ai = getGeminiClient();

    // Style prompt directive instructing the TTS system to capture the right pacing
    let styleDirection = "";
    switch (style) {
      case "punchy":
        styleDirection = "Speak with high energy, punchy broadcast cadence, and crisp punchlines for a fast-paced radio promo:";
        break;
      case "advocate":
        styleDirection = "Speak with warmth, sincere authority, trust, and relatable storytelling like a reliable consumer advocate:";
        break;
      case "dramatic":
        styleDirection = "Speak with dramatic, captivating pacing, thoughtful pauses, and resonant conviction:";
        break;
      case "conversational":
        styleDirection = "Speak warmly and naturally like a knowledgeable friend sharing real advice:";
        break;
      case "commercial":
      default:
        styleDirection = "Speak in a dynamic, articulate, confident radio commercial announcer voice with natural persuasive pauses:";
        break;
    }

    const promptText = `${styleDirection}\n\n${script.trim()}`;

    const validVoice = ["Kore", "Puck", "Fenrir", "Zephyr", "Charon", "Aoede"].includes(voice)
      ? voice
      : "Kore";

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

    const candidatePart = response.candidates?.[0]?.content?.parts?.[0];
    const rawAudioBase64 = candidatePart?.inlineData?.data;

    if (!rawAudioBase64) {
      return res.status(500).json({
        error: "No audio data was returned by the voice generation model. Please try again.",
      });
    }

    const rawBuffer = Buffer.from(rawAudioBase64, "base64");
    const wavBuffer = pcmToWav(rawBuffer, 24000, 1, 16);
    const wavBase64 = wavBuffer.toString("base64");

    const durationSeconds = rawBuffer.length / (24000 * 2);

    res.json({
      audioUrl: `data:audio/wav;base64,${wavBase64}`,
      duration: Math.round(durationSeconds * 10) / 10,
      voice: validVoice,
      style,
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
      case "punchy_15s":
        styleInstruction = "Condense this script into a high-impact 15-second radio bumper/ad spot. Keep 'Legit Africa' and the core hook clear.";
        break;
      case "extended_60s":
        styleInstruction = "Expand this commercial into a rich 60-second broadcast narrative with relatable African everyday merchant experiences (tailors, tech sellers, online vendors) emphasizing customer protection and honest reviews on Legit Africa.";
        break;
      case "pidgin_blend":
        styleInstruction = "Adapt this into an authentic, catchy, energetic Nigerian/West African Pidgin English commercial that resonates deeply on urban radio while keeping it clear and trustworthy. Keep 'Legit Africa dot com. It's free.'";
        break;
      case "urgent_alert":
        styleInstruction = "Frame this as an urgent, protective consumer alert that stops buyers from getting scammed by unvetted vendors.";
        break;
      case "radio_30s":
      default:
        styleInstruction = "Refine and optimize this into a crisp, perfectly timed 30-second broadcast commercial with punchy rhythmic line breaks.";
        break;
    }

    const prompt = `You are a world-class radio commercial copywriter for "Legit Africa" (a consumer review platform where buyers search businesses, share honest good or bad reviews, and businesses cannot pay to remove reviews).

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
