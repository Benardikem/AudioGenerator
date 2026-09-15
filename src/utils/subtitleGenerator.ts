import { SubtitleCue } from '../types';

/**
 * Parses script lines into timed subtitle cues proportional to word lengths
 * matching the total audio duration.
 */
export function generateSubtitleCues(script: string, totalDuration: number): SubtitleCue[] {
  if (!script.trim() || totalDuration <= 0) return [];

  // Split into meaningful phrases or lines
  const rawLines = script
    .split('\n')
    .map((l) => l.trim())
    .filter((l) => l.length > 0);

  // If there are very long lines, also split by period or question mark
  const phrases: string[] = [];
  rawLines.forEach((line) => {
    const parts = line.match(/[^.!?]+[.!?]+/g);
    if (parts && parts.length > 1) {
      parts.forEach((p) => phrases.push(p.trim()));
    } else {
      phrases.push(line);
    }
  });

  const totalWords = phrases.reduce((sum, p) => sum + (p.split(/\s+/).length || 1), 0);
  if (totalWords === 0) return [];

  let currentStart = 0.2; // slight lead-in
  const availableDuration = Math.max(1, totalDuration - 0.4);

  return phrases.map((text, idx) => {
    const words = text.split(/\s+/).length || 1;
    const proportion = words / totalWords;
    const duration = proportion * availableDuration;
    const start = currentStart;
    const end = Math.min(totalDuration, start + duration);
    currentStart = end;

    return {
      id: idx + 1,
      start: Math.round(start * 100) / 100,
      end: Math.round(end * 100) / 100,
      text,
    };
  });
}

function formatTimeSRT(seconds: number): string {
  const hrs = Math.floor(seconds / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);
  const millis = Math.floor((seconds % 1) * 1000);

  const pad = (n: number, z = 2) => String(n).padStart(z, '0');
  return `${pad(hrs)}:${pad(mins)}:${pad(secs)},${pad(millis, 3)}`;
}

function formatTimeVTT(seconds: number): string {
  const hrs = Math.floor(seconds / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);
  const millis = Math.floor((seconds % 1) * 1000);

  const pad = (n: number, z = 2) => String(n).padStart(z, '0');
  return `${pad(hrs)}:${pad(mins)}:${pad(secs)}.${pad(millis, 3)}`;
}

/**
 * Generates an .SRT string compatible with CapCut, Premiere, InShot, etc.
 */
export function exportToSRT(cues: SubtitleCue[]): string {
  return cues
    .map((cue) => {
      return `${cue.id}\n${formatTimeSRT(cue.start)} --> ${formatTimeSRT(cue.end)}\n${cue.text}\n`;
    })
    .join('\n');
}

/**
 * Generates a .VTT string
 */
export function exportToVTT(cues: SubtitleCue[]): string {
  const body = cues
    .map((cue) => {
      return `${cue.id}\n${formatTimeVTT(cue.start)} --> ${formatTimeVTT(cue.end)}\n${cue.text}\n`;
    })
    .join('\n');
  return `WEBVTT\n\n${body}`;
}

/**
 * Triggers browser download of a text blob
 */
export function downloadFile(content: string, filename: string, mimeType: string) {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
