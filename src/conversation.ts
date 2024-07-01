import { Conversation } from "./lib/conversations";
import { BotContext } from "./context";
import { InlineKeyboard } from "grammy";
import { PublicKey } from "@wharfkit/antelope";

const requestPublicKeyMessage = `Please enter a public key for your account\\.
You can generate keypair by the offline webapp below:
`;

const openKeypairGeneratorButton = InlineKeyboard.webApp("Generate Keypair", "https://eos-keypair.pages.dev/");

const confirmButton = InlineKeyboard.text("Create Account", "confirm");
const cancelButton = InlineKeyboard.text("Cancel", "cancel");

const publicKeyConfirmMessage = (pubkey: string) => `Create free account with public key: 
  
\`${pubkey}\`
  
Make sure you have backed up the corresponding private key\\.

If you need to use other public keys, please enter directly\\.`

const accountCreatedMessage = (account: string) => `Account created successfully: \`${account}\``;

class ClaimFreeAccount {
  conversation: Conversation<BotContext>;
  ctx: BotContext;

  constructor(conversation: Conversation<BotContext>, ctx: BotContext) {
    this.conversation = conversation;
    this.ctx = ctx;
  }

  async start() {
    await this.ctx.reply(requestPublicKeyMessage, {
      reply_markup: InlineKeyboard.from([[openKeypairGeneratorButton]]),
      parse_mode: "MarkdownV2",
    });

    const publicKey = await this.waitPublicKey();
    if (!publicKey) return;

    const confirmed = await this.confirmPublicKey(publicKey);
    
    if (!confirmed) {
      await this.ctx.reply("Account creation cancelled");
      return;
    }

    await this.ctx.reply("Creating account...");
    const account = await this.createAccount(publicKey);
    await this.ctx.reply(accountCreatedMessage(account), {
      parse_mode: "MarkdownV2",
    });
  }

  async waitPublicKey() {
    do {
      const publicKeyCtx = await this.conversation.wait();

      let publicKey = publicKeyCtx.message?.text;
      if (publicKey && this.validatePublicKey(publicKey)) {
        return publicKey;
      }

      if (publicKey) {
        if (this.isCommand(publicKey)) {
          return;
        }

        await this.ctx.reply("Invalid public key");
      }
    } while (true);
  }

  isCommand(text: string) {
    return text.startsWith("/");
  }

  async confirmPublicKey(publicKey: string): Promise<boolean> {
    await this.ctx.reply(publicKeyConfirmMessage(publicKey), {
      reply_markup: InlineKeyboard.from([[confirmButton], [cancelButton]]),
      parse_mode: "MarkdownV2",
    });

    do {
      let confirmedOrPublicKey = await this.waitConfirmOrNewPublicKey();

      if (typeof confirmedOrPublicKey === "boolean") return confirmedOrPublicKey;

      if (confirmedOrPublicKey && this.validatePublicKey(confirmedOrPublicKey)) {
        return await this.confirmPublicKey(confirmedOrPublicKey);
      }

      if (confirmedOrPublicKey) {
        if (this.isCommand(confirmedOrPublicKey)) {
          return false;
        }
        await this.ctx.reply("Invalid public key, please enter again");
      }
    } while (true);
  }

  async waitConfirmOrNewPublicKey(): Promise<boolean | string | undefined>{
    const confirmCtx = await this.conversation.wait();

    if (confirmCtx.update.callback_query?.data === "confirm") {
      return true;
    }

    if (confirmCtx.update.callback_query?.data === "cancel") {
      return false;
    }

    return confirmCtx.message?.text;
  }

  async createAccount(publicKey: string): Promise<string> {
    // TODO: create account
    return "x1sdascvsdqw";
  }

  validatePublicKey(publicKey: string) {
    try {
      PublicKey.from(publicKey);
      return true;
    } catch (e) {
      return false;
    }
  }

}

export const claimFreeAccount = async (conversation: Conversation<BotContext>, ctx: BotContext) => {
  const claimFreeAccount = new ClaimFreeAccount(conversation, ctx);
  await claimFreeAccount.start();
  return;
}