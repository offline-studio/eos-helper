import { Conversation } from "./lib/conversations";
import { BotContext } from "./context";
import { InlineKeyboard } from "grammy";
import { ABI, Action, PublicKey } from "@wharfkit/antelope";
import EOSIOAbi from "./contracts/eosio.json";
import { Session } from "@wharfkit/session"
import { WalletPluginPrivateKey } from "@wharfkit/wallet-plugin-privatekey"

export interface ClaimFreeAccountOptions {
  creator: string;
  chainId: string;
  chainApiUrl: string;
  contract: string;
  privateKey: string;
}

export class ClaimFreeAccount {
  conversation: Conversation<BotContext>;
  ctx: BotContext;

  contract: string;
  session: Session;

  constructor(conversation: Conversation<BotContext>, ctx: BotContext, {
    creator,
    chainId,
    chainApiUrl,
    contract,
    privateKey,
  }: ClaimFreeAccountOptions) {
    this.conversation = conversation;
    this.ctx = ctx;

    this.contract = contract;
    

    const walletPlugin = new WalletPluginPrivateKey(privateKey);
    this.session = new Session({
      actor: creator,
      permission: "active",
      chain: {
        id: chainId,
        url: chainApiUrl,
      },
      walletPlugin,
    });
  }

  async start() {
    const lang = await this.ctx.i18n.getLocale();
    const openKeypairGeneratorButton = InlineKeyboard.webApp(this.ctx.t("generate_keypair"), `https://eos-keypair.pages.dev?lang=${lang}`);

    await this.ctx.reply(this.ctx.t("request_pubkey"), {
      reply_markup: InlineKeyboard.from([[openKeypairGeneratorButton]]),
      parse_mode: "MarkdownV2",
    });

    const publicKey = await this.waitPublicKey();
    if (!publicKey) return;

    const confirmedPublicKey = await this.confirmPublicKey(publicKey);
    
    if (!confirmedPublicKey) {
      await this.ctx.reply(this.ctx.t("account_cancelled"));
      return;
    }

    await this.ctx.reply(this.ctx.t("account_creating"));
    const txid = await this.createAccount(confirmedPublicKey);

    console.log("txid", txid);

    await this.ctx.reply(this.ctx.t("account_created"), {
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

        await this.ctx.reply(this.ctx.t("invalid_pubkey"));
      }
    } while (true);
  }

  isCommand(text: string) {
    return text.startsWith("/");
  }

  async confirmPublicKey(publicKey: string): Promise<false | string> {
    const confirmButton = InlineKeyboard.text(this.ctx.t("create_account"), "confirm");
    const cancelButton = InlineKeyboard.text(this.ctx.t("cancel"), "cancel");

    await this.ctx.reply(this.ctx.t("confirm_pubkey", {
      pubkey: publicKey
    }), {
      reply_markup: InlineKeyboard.from([[confirmButton], [cancelButton]]),
      parse_mode: "MarkdownV2",
    });

    do {
      let confirmedOrPublicKey = await this.waitConfirmOrNewPublicKey();

      if (typeof confirmedOrPublicKey === "boolean") {
        if (confirmedOrPublicKey) {
          return publicKey;
        }
        return false;
      }

      if (confirmedOrPublicKey && this.validatePublicKey(confirmedOrPublicKey)) {
        return await this.confirmPublicKey(confirmedOrPublicKey);
      }

      if (confirmedOrPublicKey) {
        if (this.isCommand(confirmedOrPublicKey)) {
          return false;
        }
        await this.ctx.reply(this.ctx.t("invalid_pubkey"));
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
    const abi = ABI.from(EOSIOAbi);

    const action = Action.from({
      authorization: [
        this.session.permissionLevel
      ],
      account: "eosio",
      name: "ramtransfer",
      data: {
        from: this.session.actor,
        to: this.contract,
        bytes: 1536,
        memo: `buy-${publicKey}`
      }
    }, abi);

    const result = await this.session.transact({ action });

    return result.response?.transaction_id;
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