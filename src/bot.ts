import { Bot, BotConfig, InlineKeyboard, StorageAdapter, session } from "grammy";
import { welcomeMessage } from "./messages";
import { Conversation, conversations, createConversation } from "./lib/conversations";
import { BotContext, SessionData } from "./context";
import { ClaimFreeAccount, ClaimFreeAccountOptions } from "./conversation";

const langs = [{ value: "en", label: "🇺🇸 English"}, { value: "zh", label: "🇨🇳 中文"}]

export const createBot = (token: string, { botConfig, sessionStorage, ...claimFreeAccountOptions }: {
  botConfig: BotConfig<BotContext>,
  sessionStorage?: StorageAdapter<SessionData>,
} & ClaimFreeAccountOptions) => {
  const bot = new Bot<BotContext>(token, botConfig);

  bot.use(session({
    initial: () => ({
      lang: "en"
    }),
    storage: sessionStorage
  }));

  bot.use(conversations());

  const claimFreeAccount = async (conversation: Conversation<BotContext>, ctx: BotContext) => {
    const claimFreeAccount = new ClaimFreeAccount(conversation, ctx, claimFreeAccountOptions);
    await claimFreeAccount.start();
    return;
  }

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

    const parameter = ctx.match;

    if (typeof parameter === "string") {
      ctx.session.promoCode = parameter.trim();
    }

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

