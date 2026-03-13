import { NextRequest } from "next/server";
import { runAgent } from "@/lib/agent/orchestrator";
import { verifyAuthToken } from "@/lib/firebase/verify-token";
import { getUserWardrobe } from "@/lib/indexing/engine";

export async function POST(request: NextRequest) {
  const auth = await verifyAuthToken(request);
  if (!auth) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
    });
  }

  const body = await request.json();
  const message = (body.message as string)?.trim();
  if (!message) {
    return new Response(JSON.stringify({ error: "message is required" }), {
      status: 400,
    });
  }

  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      const sendLog = (log: string) => {
        controller.enqueue(
          encoder.encode(
            `data: ${JSON.stringify({ type: "log", message: log })}\n\n`,
          ),
        );
      };
      const sendImageUrl = (url: string) => {
        controller.enqueue(
          encoder.encode(
            `data: ${JSON.stringify({ type: "image", imageUrl: url })}\n\n`,
          ),
        );
      };

      try {
        const catalog = await getUserWardrobe(auth.uid);
        const response = await runAgent(
          message,
          catalog,
          auth.uid,
          sendLog,
          sendImageUrl,
        );
        controller.enqueue(
          encoder.encode(
            `data: ${JSON.stringify({ type: "done", response })}\n\n`,
          ),
        );
      } catch (e) {
        const err = e instanceof Error ? e.message : "Unknown error";
        controller.enqueue(
          encoder.encode(
            `data: ${JSON.stringify({ type: "error", error: err })}\n\n`,
          ),
        );
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  });
}
