import { NextRequest, NextResponse } from "next/server";
import { GoogleGenAI } from "@google/genai";

export async function POST(request: NextRequest) {
  const body = await request.json();
  const logs = (body.logs as string[]) ?? [];

  if (logs.length === 0) {
    return NextResponse.json({ summary: "No agent activity." });
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ summary: fallbackSummary(logs) });
  }

  try {
    const ai = new GoogleGenAI({ apiKey });
    const prompt = [
      "You are summarizing internal agent logs for a fashion assistant app.",
      "The user wants a short, friendly 1-2 sentence summary of what the agent did.",
      "Focus on: which tools were called, what clothing items were picked, and how many outfit images were generated.",
      "Do NOT include file paths or technical details. Keep it casual and concise.",
      "",
      "Logs:",
      ...logs,
    ].join("\n");

    const response = await ai.models.generateContent({
      model: "gemini-2.0-flash",
      contents: prompt,
    });

    const text =
      (response as { text?: string })?.text?.trim() ||
      (
        response as {
          candidates?: { content?: { parts?: { text?: string }[] } }[];
        }
      )?.candidates?.[0]?.content?.parts?.[0]?.text?.trim();

    return NextResponse.json({ summary: text || fallbackSummary(logs) });
  } catch {
    return NextResponse.json({ summary: fallbackSummary(logs) });
  }
}

function fallbackSummary(logs: string[]): string {
  const toolCalls = logs.filter((l) => l.startsWith("Calling tool:")).length;
  const images = logs.filter((l) => l.includes("[SAVED]")).length;
  const parts: string[] = [];
  if (toolCalls > 0) parts.push(`used ${toolCalls} tool${toolCalls > 1 ? "s" : ""}`);
  if (images > 0) parts.push(`generated ${images} outfit image${images > 1 ? "s" : ""}`);
  if (parts.length === 0) return "Agent processed your request.";
  return `Agent ${parts.join(" and ")}.`;
}
