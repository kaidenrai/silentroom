import { GoogleGenerativeAI } from "@google/generative-ai";

const GEMINI_API_KEY = process.env.GEMINI_API_KEY || "";

const client = new GoogleGenerativeAI(GEMINI_API_KEY);
const model = client.getGenerativeModel({ model: "gemma-3-27b-it" });
export interface AnalysisResult {
  satisfaction_score: number;
  status: "COMPLETE" | "PENDING" | "REJECTED";
  consensus_points: string[];
  blockers: Array<{
    owner: string;
    issue: string;
    severity: "high" | "medium" | "low";
  }>;
  alignment_percent: number;
  meeting_needed: boolean;
  suggested_attendees: string[];
  suggested_agenda: string;
}

/**
 * Analyze transcribed responses using Google Gemini
 */
export async function analyzeResponses(
  responses: Array<{
    name: string;
    transcript: string;
  }>
): Promise<AnalysisResult> {
  const responseSummary = responses
    .map((r) => `${r.name}: ${r.transcript}`)
    .join("\n\n");

  const prompt = `You are an expert standup analyzer. Analyze these team standup responses and return a JSON object with the following structure:

Responses:
${responseSummary}

Return a JSON object (valid JSON, no markdown) with these exact fields:
{
  "satisfaction_score": (0-100 number),
  "status": ("COMPLETE" | "PENDING" | "REJECTED"),
  "consensus_points": (array of 2-3 strings that the team agrees on),
  "blockers": (array of objects with {owner, issue, severity: "high"|"medium"|"low"}),
  "alignment_percent": (0-100 number),
  "meeting_needed": (boolean),
  "suggested_attendees": (array of names of people whose responses surfaced blockers),
  "suggested_agenda": (string with suggested meeting agenda)
}

Scoring rules:
- COMPLETE: score >= 75 and no high-severity blockers
- PENDING: score 40-74 with mixed signals or minor blockers
- REJECTED: score < 40 or critical blockers
`;

  try {
    const result = await model.generateContent(prompt);
    const responseText = result.response.text();

    // Parse the JSON response
    const jsonMatch = responseText.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error("Could not parse JSON from Gemini response");
    }

    const parsed = JSON.parse(jsonMatch[0]) as AnalysisResult;
    return parsed;
  } catch (error) {
    console.error("Gemini analysis error:", error);
    throw error;
  }
}

/**
 * Generate a summary narrative from responses
 */
export async function generateSummary(
  responses: Array<{
    name: string;
    transcript: string;
  }>
): Promise<string> {
  const responseSummary = responses
    .map((r) => `${r.name}: ${r.transcript}`)
    .join("\n\n");

  const prompt = `Summarize these team standup responses in 2-3 sentences for a TTS narration. Be concise and actionable.

Responses:
${responseSummary}`;

  try {
    const result = await model.generateContent(prompt);
    return result.response.text();
  } catch (error) {
    console.error("Summary generation error:", error);
    throw error;
  }
}
