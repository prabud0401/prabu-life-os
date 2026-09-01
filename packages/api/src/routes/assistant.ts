import { Router, type Response } from "express";
import {
  askCursorAssistant,
  isCursorAssistantConfigured,
  resetAssistantSession,
  type AssistantChatMessage,
} from "../assistant/cursor-client";
import { requireAuth, type AuthenticatedRequest } from "../middleware/auth";

export const assistantRouter = Router();

assistantRouter.get("/health", (_req, res: Response) => {
  res.json({
    configured: isCursorAssistantConfigured(),
    provider: "cursor",
    model: process.env.CURSOR_MODEL?.trim() || "composer-2.5",
  });
});

assistantRouter.post("/chat", requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  const message = typeof req.body?.message === "string" ? req.body.message.trim() : "";
  const resetSession = Boolean(req.body?.resetSession);
  const history = Array.isArray(req.body?.history)
    ? (req.body.history as AssistantChatMessage[]).filter(
        (item) =>
          item &&
          (item.role === "user" || item.role === "assistant") &&
          typeof item.content === "string"
      )
    : [];

  if (!message) {
    res.status(400).json({ error: "message is required" });
    return;
  }

  if (!isCursorAssistantConfigured()) {
    res.status(503).json({
      error: "CURSOR_API_KEY is not configured on the server",
      configured: false,
    });
    return;
  }

  try {
    const result = await askCursorAssistant(message, history, { resetSession });
    res.json(result);
  } catch (err) {
    res.status(500).json({
      error: (err as Error).message || "Cursor assistant request failed",
    });
  }
});

assistantRouter.post("/reset", requireAuth, async (_req: AuthenticatedRequest, res: Response) => {
  await resetAssistantSession();
  res.json({ ok: true });
});
