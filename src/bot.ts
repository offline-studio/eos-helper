import { Bot, BotConfig, InlineKeyboard, StorageAdapter, session } from "grammy";
import { welcomeMessage } from "./messages";
import { conversations, createConversation } from "./lib/conversations";
import { BotContext, SessionData } from "./context";
import { claimFreeAccount } from "./conversation";

const langs = [{ value: "en", label: "🇺🇸 English"}, { value: "zh", label: "🇨🇳 中文"}]

export const createBot = (token: string, config?: BotConfig<BotContext> & {
  sessionStorage?: StorageAdapter<SessionData>
}) => {
  const bot = new Bot<BotContext>(token, config);

  bot.use(session({
    initial: () => ({
      lang: "en"
    }),
    storage: config?.sessionStorage
  }));

  bot.use(conversations());

  bot.use(createConversation(claimFreeAccount));

  const langButtons = langs.map(({
    value,
    label
  }) => InlineKeyboard.text(label, `lang-${value}`));

  langs.forEach(({ label, value }) => {
    bot.callbackQuery(`lang-${value}`, async (ctx: BotContext) => {
      ctx.session.lang = value;
      await ctx.answerCallbackQuery({ text: `Language set to ${label}` });
    });
  })
 
  
  bot.command("start", async (ctx: BotContext) => {
    await ctx.conversation.exit();

    await ctx.reply(welcomeMessage, {
      parse_mode: "MarkdownV2",
      reply_markup: InlineKeyboard.from([langButtons])
    });
  });

  bot.command("free_account", async (ctx: BotContext) => {
    await ctx.conversation.exit();

    await ctx.conversation.enter("claimFreeAccount");
  });

  return bot
}

