import type { ConversationFlavor } from "./lib/conversations";
import type { Context, SessionFlavor } from "grammy";

export type SessionData = {
  lang: string;
}

export type BotContext = Context & SessionFlavor<SessionData> & ConversationFlavor;