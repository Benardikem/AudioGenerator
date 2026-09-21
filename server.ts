import express from "express";
import path from "path";
import fs from "fs";
import os from "os";
import { spawn } from "child_process";
import dotenv from "dotenv";
import { GoogleGenAI, Modality } from "@google/genai";
import { createServer as createViteServer } from "vite";
import { installAuth } from "./auth";
import { installCommercialsApi } from "./commercialsStore";
import { installSceneVideosApi } from "./sceneVideos";
import { installMediaApi } from "./mediaApi";
import { storeImage } from "./commercialsStore";

/** Keep in step with MAX_SCENES in src/utils/sceneTimeline.ts. */
const MAX_SCENES = 24;

dotenv.config();

const app = express();
const PORT = 3000;

// DO NOT REMOVE OR MOVE. Login first: every route registered after this needs a signed-in
// session. The app is public at studio.legitafrica.com and the API spends a real Gemini key.
// See GEMINI.md.
installAuth(app);

app.use(express.json({ limit: "10mb" }));

// DO NOT REMOVE. Saved commercials (Postgres). Must stay after installAuth. See GEMINI.md.
installCommercialsApi(app);

// DO NOT REMOVE. Scene video clips (files on disk). Must stay after installAuth. See GEMINI.md.
installSceneVideosApi(app);

// The Media screen: lists photos and clips with the adverts using them, and deletes unused ones.
installMediaApi(app);

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
 * Turns a Gemini API failure into a message the person using the studio can act on, instead of
 * a raw JSON error or, worse, a silent stand-in result.
 */
const VOICE_MODELS = ["gemini-3.1-flash-tts-preview", "gemini-2.5-flash-preview-tts"];
const TEXT_MODELS = ["gemini-3.8-flash", "gemini-3.1-flash-lite"];

/** A free-tier daily allowance being used up, as opposed to a short burst limit or a real fault. */
function isDailyLimit(error: any) {
  return /PerDay|free_tier_requests/i.test(String(error?.message ?? error ?? ""));
}

/** Temporary high demand, unavailable, or rate limit spikes that can recover with an alternative model. */
function isTransientFailure(error: any) {
  const raw = String(error?.message ?? error ?? "");
  return /\b503\b|UNAVAILABLE|high demand|overloaded|spikes in demand|RESOURCE_EXHAUSTED|\b429\b/i.test(raw);
}

async function generateTextWithFallback(
  ai: GoogleGenAI,
  params: { contents: string; config?: any }
) {
  let response: any;
  let usedModel = TEXT_MODELS[0];
  for (let i = 0; i < TEXT_MODELS.length; i++) {
    usedModel = TEXT_MODELS[i];
    try {
      response = await ai.models.generateContent({
        model: usedModel,
        contents: params.contents,
        config: params.config,
      });
      return { response, usedModel };
    } catch (err: any) {
      const lastModel = i === TEXT_MODELS.length - 1;
      if (lastModel || !isTransientFailure(err)) throw err;
      console.warn(`[text-gen] ${usedModel} temporary spike or limit reached, falling back to ${TEXT_MODELS[i + 1]}`);
    }
  }
  return { response, usedModel };
}

function geminiError(error: any, fallback: string): { status: number; message: string } {
  const raw = String(error?.message ?? error ?? "");
  if (isDailyLimit(error)) {
    return {
      status: 429,
      // Google resets free-tier daily limits at midnight Pacific time, which is 8am or 9am in Lagos.
      message:
        "Today's free Gemini allowance for this is used up. It resets around 8am Nigeria time. Opening the app in AI Studio's preview uses the same allowance.",
    };
  }
  if (/prepayment credits are depleted/i.test(raw)) {
    return {
      status: 402,
      message:
        "Your Gemini account has run out of credit, so nothing can be generated. Add credit in AI Studio, or switch the studio to a free-tier API key.",
    };
  }
  if (/RESOURCE_EXHAUSTED|\b429\b|quota|rate limit/i.test(raw)) {
    return { status: 429, message: "Gemini's usage limit was reached. Wait a minute and try again." };
  }
  if (/\b503\b|UNAVAILABLE|high demand|overloaded/i.test(raw)) {
    return { status: 503, message: "Gemini is currently experiencing high demand. Please try again in a few moments." };
  }
  if (/API key not valid|API_KEY_INVALID|PERMISSION_DENIED/i.test(raw)) {
    return { status: 502, message: "Gemini rejected the API key set on the server." };
  }
  if (/no longer available|is not found for API version|NOT_FOUND/i.test(raw)) {
    return { status: 502, message: "The Gemini model this feature uses is no longer available. The studio needs updating." };
  }
  return { status: 500, message: fallback };
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

    // On the free tier each voice model has its own small daily allowance (10 requests for
    // gemini-3.1-flash-tts). When the preferred model's is used up, the older model still has
    // its own, so use it rather than stop, and tell the person it happened: the voice can sound
    // slightly different. Any other kind of failure is not retried.
    let response: any;
    let usedModel = VOICE_MODELS[0];
    for (let i = 0; ; i++) {
      usedModel = VOICE_MODELS[i];
      try {
        response = await ai.models.generateContent({
          model: usedModel,
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
        break;
      } catch (err: any) {
        const lastModel = i === VOICE_MODELS.length - 1;
        if (lastModel || !isDailyLimit(err)) throw err;
        console.warn(`[voiceover] ${usedModel} daily limit reached, trying ${VOICE_MODELS[i + 1]}`);
      }
    }

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
      model: usedModel,
      usedBackupModel: usedModel !== VOICE_MODELS[0],
    });
  } catch (error: any) {
    console.error("Audio generation error:", error);
    const { status, message } = geminiError(error, "The voiceover could not be generated. Please try again.");
    res.status(status).json({ error: message });
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

    const { response } = await generateTextWithFallback(ai, {
      contents: prompt,
    });

    const polishedScript = response.text?.trim() || originalScript;
    res.json({ script: polishedScript });
  } catch (error: any) {
    console.error("Polish script error:", error);
    const { status, message } = geminiError(error, "The script could not be polished. Please try again.");
    res.status(status).json({ error: message });
  }
});

/**
 * Makes a picture for a scene from its visual prompt.
 *
 * Uses Nano Banana (gemini-2.5-flash-image), which the free key can call — unlike the Pro image
 * model, which has no free quota at all. The advert's look is appended here rather than typed
 * every time, so generated stills sit alongside the filmed clips instead of looking like a
 * different production.
 */
const IMAGE_MODEL = "gemini-2.5-flash-image";
const HOUSE_STYLE =
  "Photographed on a 35mm lens, shallow depth of field, natural available light, warm Lagos colour, " +
  "fine film grain, documentary realism, no stylisation. Portrait framing, the subject centred with " +
  "clear space above and below. A clean photograph with no lettering, signage or captions anywhere in it.";

app.post("/api/generate-scene-image", async (req, res) => {
  const prompt = String(req.body?.prompt ?? "").trim();
  if (prompt.length < 8) {
    return res.status(400).json({ error: "Write a visual prompt first — a sentence or two describing the shot." });
  }
  if (prompt.length > 2000) {
    return res.status(400).json({ error: "That visual prompt is too long." });
  }

  try {
    const ai = getGeminiClient();
    const response = await ai.models.generateContent({
      model: IMAGE_MODEL,
      contents: `${prompt}\n\n${HOUSE_STYLE}`,
      config: { responseModalities: [Modality.IMAGE] },
    });

    const parts = response?.candidates?.[0]?.content?.parts ?? [];
    const image = parts.find((p: any) => p?.inlineData?.data);
    if (!image) {
      // A refusal comes back as words rather than a picture, so say so instead of failing silently.
      const words = parts.find((p: any) => p?.text)?.text;
      return res.status(502).json({
        error: words ? `No picture came back: ${String(words).slice(0, 200)}` : "No picture came back. Try wording the shot differently.",
      });
    }

    const bytes = Buffer.from(image.inlineData.data, "base64");
    const url = await storeImage(bytes, image.inlineData.mimeType || "image/png");
    res.json({ url });
  } catch (error: any) {
    console.error("Scene image generation error:", error);
    // Every image model this key can reach reports a free-tier limit of zero, so a 429 here means
    // "billing is off", not "come back tomorrow". Saying the latter would send the user away to wait
    // for a reset that never comes.
    if (/limit: 0|RESOURCE_EXHAUSTED|\b429\b|quota/i.test(String(error?.message ?? error))) {
      return res.status(402).json({
        error:
          "Making pictures is not included in the free Gemini allowance — it needs billing switched on for the API key. Until then, make the picture in AI Studio and upload it with the button above.",
      });
    }
    const { status, message } = geminiError(error, "The picture could not be generated. Please try again.");
    res.status(status).json({ error: message });
  }
});

// Generate a full commercial campaign (title, script, storyboard scenes) from a user topic or prompt
app.post("/api/create-ad-campaign", async (req, res) => {
  const { topic = "", style = "pidgin_warm", businessType = "General" } = req.body;

  try {
    const ai = getGeminiClient();

    let styleDirection = "";
    switch (style) {
      case "pidgin_warm":
      case "pidgin_blend":
        styleDirection = "Speak in authentic, warm Nigerian Pidgin English. Conversational, everyday Lagos vibe, trustworthy, relatable, and calm.";
        break;
      case "social_reels":
        styleDirection = "Speak like a relatable social media creator talking directly to their phone camera on Instagram Reels or TikTok. Casual, authentic, and engaging.";
        break;
      case "storytime_pov":
        styleDirection = "Frame as an eye-opening Storytime narrative ('Let me tell you about what happened...'). Grounded, suspenseful, and honest.";
        break;
      case "urgent_alert":
        styleDirection = "Speak with a serious, urgent consumer protection tone to warn buyers before they send money.";
        break;
      default:
        styleDirection = "Speak in authentic Nigerian Pidgin with warm, trustworthy pacing.";
        break;
    }

    const prompt = `You are an expert commercial director and voiceover writer for "Legit Africa" (legitafrica.com).
Legit Africa is a trusted consumer review platform in Africa where customers search businesses, read genuine reviews before paying, and post real feedback (good or bad) that businesses cannot pay to remove.

The user wants to create a new commercial ad about:
Topic / Story: "${topic || "Protecting everyday buyers from unverified vendors"}"
Business Category: "${businessType}"

Delivery Tone: ${styleDirection}

Generate a JSON object with:
1. "title": A short, punchy 3-6 word campaign title (e.g., "Computer Village Phone Caution" or "Lekki Tailor Wedding Dilemma")
2. "script": A 30-35 second spoken voiceover script formatted in 8-10 short, readable lines. Must include:
   - Strong hook in the first line
   - The dilemma or vendor scenario
   - The solution: Search the business on Legit Africa dot com before paying
   - Punchy call to action: "Search the business. Say wetin happen, good or bad. Legit Africa dot com. E free!"
3. "scenes": One scene object per line of the script, in the same order as the lines. Use as many scenes as the script has lines (never more than ${MAX_SCENES}):
   - "id": 1, 2, 3 ... counting up
   - "voiceLine": the script line spoken over this scene, word for word
   - "visualPrompt": A descriptive camera/visual direction for what is shown on screen
   - "type": "photo" for an ordinary shot, and these LegitAfrica screens where the line calls for them:
     "ui_search" for the line telling the viewer to search the business on Legit Africa,
     "ui_review" for the line about honest reviews that cannot be paid off,
     "logo" for the line asking the viewer to tell others what happened,
     "end_card" for the final line. The last scene must be "end_card".

Output ONLY valid JSON without Markdown blocks or extra text:
{
  "title": "...",
  "script": "...",
  "scenes": [
    { "id": 1, "voiceLine": "...", "visualPrompt": "...", "type": "photo" }
  ]
}`;

    // On demand spikes (503) or rate limits, falls back to gemini-3.1-flash-lite
    const { response, usedModel } = await generateTextWithFallback(ai, {
      contents: prompt,
      config: {
        responseMimeType: "application/json",
      },
    });

    const text = response?.text || "{}";
    let data;
    try {
      data = JSON.parse(text);
    } catch {
      const cleaned = text.replace(/```json/g, "").replace(/```/g, "").trim();
      data = JSON.parse(cleaned);
    }

    const photoImages = ["/scenes/scene1.jpg", "/scenes/scene2.jpg", "/scenes/scene3.jpg", "/scenes/scene3_v2.jpg"];
    const brandImages: Record<string, string> = {
      ui_search: "/brand/logo-clean.png",
      ui_review: "/brand/legitafrica-icon-transparent.png",
      logo: "/brand/legitafrica-icon-transparent.png",
      end_card: "/brand/logo-clean.png",
    };
    const SCENE_TYPES = ["photo", "text", "logo", "ui_search", "ui_review", "end_card"];

    let photoCount = 0;
    const formattedScenes = (data.scenes || []).slice(0, MAX_SCENES).map((s: any, idx: number) => {
      const type = SCENE_TYPES.includes(s.type) ? s.type : "photo";
      return {
        id: idx + 1,
        voiceLine: s.voiceLine || "",
        visualPrompt: s.visualPrompt || `Scene ${idx + 1} camera direction.`,
        type,
        imageSrc: brandImages[type] || photoImages[photoCount++ % photoImages.length],
        layoutVersion: 2,
      };
    });

    if (formattedScenes.length > 0 && data.title && data.script) {
      return res.json({
        title: data.title,
        script: data.script,
        scenes: formattedScenes,
      });
    }

    // A script about something other than the requested topic is worse than an error: the
    // person can't tell it wasn't generated for them. So an incomplete answer is reported.
    if (!data.title || !data.script) {
      return res.status(502).json({ error: "The AI returned an incomplete ad. Please try again." });
    }
    res.json({ title: data.title, script: data.script, scenes: formattedScenes.length > 0 ? formattedScenes : undefined });
  } catch (error: any) {
    console.error("AI campaign generation error:", error);
    const { status, message } = geminiError(error, "The ad could not be generated. Please try again.");
    res.status(status).json({ error: message });
  }
});

// Convert WebM canvas recording to Social Media MP4 (H.264 / AAC, yuv420p, faststart)
app.post("/api/convert-to-mp4", (req, res) => {
  const tempId = `video_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  const inputPath = path.join(os.tmpdir(), `${tempId}.webm`);
  const outputPath = path.join(os.tmpdir(), `${tempId}.mp4`);

  const writeStream = fs.createWriteStream(inputPath);
  req.pipe(writeStream);

  function cleanup() {
    try {
      if (fs.existsSync(inputPath)) fs.unlinkSync(inputPath);
    } catch (_) {}
    try {
      if (fs.existsSync(outputPath)) fs.unlinkSync(outputPath);
    } catch (_) {}
  }

  writeStream.on("error", (err) => {
    console.error("Upload write stream error:", err);
    if (!res.headersSent) {
      res.status(500).json({ error: "Failed to upload video stream." });
    }
    cleanup();
  });

  req.on("aborted", () => {
    console.warn("Client aborted upload stream.");
    cleanup();
  });

  writeStream.on("finish", () => {
    try {
      const stats = fs.statSync(inputPath);
      if (stats.size === 0) {
        cleanup();
        return res.status(400).json({ error: "Uploaded video payload is empty." });
      }
      console.log(`Received WebM video (${(stats.size / 1024 / 1024).toFixed(2)} MB), starting fast H.264 MP4 encode...`);
    } catch (e) {
      cleanup();
      return res.status(400).json({ error: "Could not read uploaded video." });
    }

    // Convert via ffmpeg to standard Social-Media MP4:
    // -r 30 : locks 30fps to avoid Chrome's 1k tbr variable framerate slowdown
    // -c:v libx264 : standard H.264 video codec required by Instagram, TikTok, FB, WhatsApp
    // -preset veryfast : ultrafast made files four times larger for no visible gain — it trades
    //   compression away for speed, and an 85-second advert came out at 82 MB
    // -crf 23 : the usual sweet spot for social video
    // -maxrate/-bufsize : keeps a busy scene from spiking the file size
    // -pix_fmt yuv420p : 8-bit YUV 4:2:0 format required for mobile hardware decoding
    // -c:a aac : universal AAC audio codec
    // -b:a 192k : high fidelity stereo audio
    // -movflags +faststart : places moov atom at beginning for instant social media playback
    // -threads 0 : utilizes all available container CPU cores
    const args = [
      "-y",
      "-i", inputPath,
      "-r", "30",
      "-c:v", "libx264",
      "-preset", "veryfast",
      "-crf", "23",
      "-maxrate", "4M",
      "-bufsize", "8M",
      "-pix_fmt", "yuv420p",
      "-c:a", "aac",
      "-b:a", "128k",
      "-movflags", "+faststart",
      "-threads", "0",
      outputPath,
    ];

    const ffmpeg = spawn("ffmpeg", args);
    let stderrData = "";

    // Safety timeout so it never hangs indefinitely. Longer than it was: veryfast is slower than
    // ultrafast, and a 90-second advert on a two-core box needs the room.
    const timeout = setTimeout(() => {
      console.error("FFmpeg conversion timed out, terminating process...");
      ffmpeg.kill("SIGKILL");
      if (!res.headersSent) {
        res.status(504).json({ error: "Video conversion timed out. Please try again." });
      }
      cleanup();
    }, 180000);

    ffmpeg.stderr.on("data", (chunk) => {
      stderrData += chunk.toString();
    });

    ffmpeg.on("close", (code) => {
      clearTimeout(timeout);
      if (res.headersSent) {
        cleanup();
        return;
      }

      if (code !== 0) {
        console.error("FFmpeg conversion error:", stderrData);
        cleanup();
        return res.status(500).json({ error: "Video conversion to MP4 failed.", details: stderrData.slice(-400) });
      }

      try {
        const outStats = fs.statSync(outputPath);
        console.log(`MP4 conversion complete! Output size: ${(outStats.size / 1024 / 1024).toFixed(2)} MB`);
      } catch (_) {}

      res.setHeader("Content-Type", "video/mp4");
      res.setHeader("Content-Disposition", 'attachment; filename="legitafrica-commercial-4x5.mp4"');

      const readStream = fs.createReadStream(outputPath);
      readStream.pipe(res);
      readStream.on("close", () => {
        cleanup();
      });
      readStream.on("error", (err) => {
        console.error("ReadStream error streaming MP4:", err);
        cleanup();
      });
    });

    ffmpeg.on("error", (err) => {
      clearTimeout(timeout);
      console.error("Failed to spawn ffmpeg:", err);
      cleanup();
      if (!res.headersSent) {
        res.status(500).json({ error: "FFmpeg process error." });
      }
    });
  });
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
