import { Bot, BotConfig, GrammyError, HttpError, InlineKeyboard, StorageAdapter, session } from "grammy";
import { Conversation, conversations, createConversation } from "./lib/conversations";
import { BotContext, SessionData } from "./context";
import { ClaimFreeAccount, ClaimFreeAccountOptions } from "./conversation";
import { I18n, TranslationVariables } from "./lib/i18n";
import { en } from "./locales/en";
import { zh } from "./locales/zh";

const langs = [{ value: "en", label: "🇺🇸 English"}, { value: "zh", label: "🇨🇳 中文"}]

export const createBot = (token: string, { botConfig, sessionStorage, ...claimFreeAccountOptions }: {
  botConfig: BotConfig<BotContext>,
  sessionStorage?: StorageAdapter<SessionData>,
} & ClaimFreeAccountOptions) => {
  const bot = new Bot<BotContext>(token, botConfig);

  const i18n = new I18n<BotContext>({
    defaultLocale: "en",
    useSession: true,
  });

  i18n.loadLocaleSync("en", {
    source: en,
  });
  i18n.loadLocaleSync("zh", {
    source: zh,
  });

  bot.use(session({
    initial: () => ({}),
    storage: sessionStorage
  }));

  bot.use(i18n);

  bot.use(conversations());

  const claimFreeAccountConversation = new ClaimFreeAccount(claimFreeAccountOptions);

  const claimFreeAccount = async (conversation: Conversation<BotContext>, ctx: BotContext) => {
    ctx.t = <K extends string>(
      key: string,
      translationVariables?: TranslationVariables<K>,
    ): string => {
      return i18n.translate(ctx.session.__language_code || "en", key, translationVariables);
    }
    
    await claimFreeAccountConversation.start(conversation, ctx);
    return;
  }

  bot.use(createConversation(claimFreeAccount));

  const langButtons = langs.map(({
    value,
    label
  }) => InlineKeyboard.text(label, `lang-${value}`));

  langs.forEach(({ label, value }) => {
    bot.callbackQuery(`lang-${value}`, async (ctx: BotContext) => {
      const currentLocale = await ctx.i18n.getLocale();
      if (currentLocale === value) {
        return;
      }

      await ctx.i18n.setLocale(value);
      await ctx.answerCallbackQuery({ text: ctx.t("language_set", { lang: label }) });
      await ctx.editMessageText(ctx.t("welcome"), {
        parse_mode: "MarkdownV2",
        reply_markup: InlineKeyboard.from([langButtons])
      });
    });
  })
 
  
  bot.command("start", async (ctx: BotContext) => {
    await ctx.conversation.exit();

    const parameter = ctx.match;

    if (typeof parameter === "string") {
      ctx.session.promoCode = parameter.trim();
    }

    if (!ctx.session.__language_code) {
      const languageCode = ctx.from?.language_code;
      if (languageCode && languageCode.startsWith("zh")) {
        await ctx.i18n.setLocale("zh");
      }
    }
    

    await ctx.reply(ctx.t("welcome"), {
      parse_mode: "MarkdownV2",
      reply_markup: InlineKeyboard.from([langButtons])
    });
  });

  bot.command("free_account", async (ctx: BotContext) => {
    await ctx.conversation.exit();

    await ctx.conversation.enter("claimFreeAccount");
  });

  bot.catch((err) => {
    const ctx = err.ctx;
    console.error(`Error while handling update ${ctx.update.update_id}:`);
    const e = err.error;
    if (e instanceof GrammyError) {
      console.error("Error in request:", e.description);
    } else if (e instanceof HttpError) {
      console.error("Could not contact Telegram:", e);
    } else {
      console.error("Unknown error:", e);
    }
  })

  return bot
}

