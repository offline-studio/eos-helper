import { I18nFlavor } from "./lib/i18n";
import type { ConversationFlavor } from "./lib/conversations";
import type { Context, SessionFlavor } from "grammy";

export type SessionData = {
  __language_code?: string;
  promoCode?: string;
}

export type BotContext = Context & SessionFlavor<SessionData> & ConversationFlavor & I18nFlavor;