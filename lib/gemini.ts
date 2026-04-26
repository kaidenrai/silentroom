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

export interface DynamicPrompt {
  id: string;
  question: string;
  category: string;
  reasoning: string;
}

export interface SolutionProposal {
  title: string;
  description: string;
  rationale: string;
  pros: string[];
  cons: string[];
  implementation_difficulty: "low" | "medium" | "high";
  estimated_effort: string;
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

/**
 * Generate dynamic prompts/questions based on meeting description and responses
 */
export async function generateDynamicPrompts(
  description: string,
  responses?: Array<{
    name: string;
    transcript: string;
  }>
): Promise<DynamicPrompt[]> {
  const responseContext = responses
    ? `\n\nCurrent responses:\n${responses.map((r) => `${r.name}: ${r.transcript}`).join("\n\n")}`
    : "";

  const prompt = `Given this meeting description, generate 3-4 targeted follow-up questions to deepen discussion and surface solutions.

Meeting Description:
${description}${responseContext}

Return ONLY a valid JSON array of objects with this exact structure:
[
  {
    "id": "q1",
    "question": "specific question",
    "category": "problem|solution|timeline|resources|risks",
    "reasoning": "why this question matters"
  }
]

Focus on:
1. Understanding root causes
2. Identifying potential solutions
3. Understanding constraints and timeline
4. Gathering actionable feedback`;

  try {
    const result = await model.generateContent(prompt);
    const responseText = result.response.text();

    // Parse the JSON response
    const jsonMatch = responseText.match(/\[[\s\S]*\]/);
    if (!jsonMatch) {
      throw new Error("Could not parse JSON from Gemini response");
    }

    const prompts = JSON.parse(jsonMatch[0]) as DynamicPrompt[];
    return prompts;
  } catch (error) {
    console.error("Dynamic prompts generation error:", error);
    throw error;
  }
}

/**
 * Generate solution proposals based on responses
 */
export async function generateSolutions(
  description: string,
  responses: Array<{
    name: string;
    transcript: string;
  }>
): Promise<SolutionProposal[]> {
  const responseSummary = responses
    .map((r) => `${r.name}: ${r.transcript}`)
    .join("\n\n");

  const prompt = `Based on this meeting description and team responses, propose exactly 4 concrete, actionable solutions.

Meeting Description:
${description}

Team Responses:
${responseSummary}

Return ONLY a valid JSON array of exactly 4 solution objects with this exact structure:
[
  {
    "title": "solution name",
    "description": "2-3 sentence explanation",
    "rationale": "why this addresses the issues",
    "pros": ["pro1", "pro2", "pro3"],
    "cons": ["con1", "con2"],
    "implementation_difficulty": "low|medium|high",
    "estimated_effort": "e.g., 2-3 days, 1 week, etc"
  }
]

Requirements:
- Do not suggest another meeting or say "meet to discuss" or "schedule a meeting to decide".
- If the issue is scheduling, recommend a specific time or concrete plan, such as "Hold the sync at 5pm Sunday".
- If people shared availability, propose a precise option instead of asking the team to meet to decide.
- Keep solutions distinct, realistic, and directly tied to the responses above.
`;

  try {
    const result = await model.generateContent(prompt);
    const responseText = result.response.text();

    // Parse the JSON response
    const jsonMatch = responseText.match(/\[[\s\S]*\]/);
    if (!jsonMatch) {
      throw new Error("Could not parse JSON from Gemini response");
    }

    const solutions = JSON.parse(jsonMatch[0]) as SolutionProposal[];
    return solutions;
  } catch (error) {
    console.error("Solutions generation error:", error);
    throw error;
  }
}
