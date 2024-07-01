import { Conversation } from "./lib/conversations";
import { BotContext } from "./context";
import { InlineKeyboard } from "grammy";
import { PublicKey } from "@wharfkit/antelope";
import { KVStorage } from "./kvstorage";
import { Api, JsonRpc } from 'enf-eosjs';
import { JsSignatureProvider } from 'enf-eosjs/dist/eosjs-jssig'; 
import { Buffer } from "node:buffer";

globalThis.Buffer = Buffer;

export interface ClaimFreeAccountOptions {
  creator: string;
  chainId: string;
  chainApiUrl: string;
  contract: string;
  privateKey: string;
  claimRecords: KVStorage;
}

export class ClaimFreeAccount {
  contract: string;
  claimRecords: KVStorage;
  api: Api;
  creator: string;

  constructor({
    creator,
    chainId,
    chainApiUrl,
    contract,
    privateKey,
    claimRecords  
  }: ClaimFreeAccountOptions) {
    this.contract = contract;
    this.claimRecords = claimRecords;

    // const walletPlugin = new WalletPluginPrivateKey(privateKey);

    this.api = new Api({
      rpc: new JsonRpc(chainApiUrl, { fetch: fetch as any }),
      signatureProvider: new JsSignatureProvider([privateKey]),
    });
    this.creator = creator;

    // this.session = new Session({
    //   actor: creator,
    //   permission: "active",
    //   chain: {
    //     id: chainId,
    //     url: chainApiUrl,
    //   },
    //   walletPlugin,
    // }, {
    //   fetch,
    // });
  }

  async start(conversation: Conversation<BotContext>, ctx: BotContext) {
    const fromUser = ctx.from;
    if (!fromUser) return;

    const claimRecord = await this.claimRecords.get(fromUser.id.toString());
    if (claimRecord) {
      await ctx.reply(ctx.t("account_claimed"));
      return;
    }

    const lang = ctx.session.__language_code;

    const openKeypairGeneratorButton = InlineKeyboard.webApp(ctx.t("generate_keypair"), `https://eos-keypair.pages.dev?lang=${lang}`);

    await ctx.reply(ctx.t("request_pubkey"), {
      reply_markup: InlineKeyboard.from([[openKeypairGeneratorButton]]),
      parse_mode: "MarkdownV2",
    });

    const publicKey = await this.waitPublicKey(conversation, ctx);
    if (!publicKey) return;

    const confirmedPublicKey = await this.confirmPublicKey(conversation, ctx, publicKey.trim());
    
    if (!confirmedPublicKey) {
      await ctx.reply(ctx.t("account_cancelled"));
      return;
    }

    await ctx.reply(ctx.t("account_creating"));

    try {
      const txid = await this.createAccount(confirmedPublicKey);

      if (txid) {
        const now = Date.now().valueOf();
        const promoCode = ctx.session.promoCode;
        await this.claimRecords.set(fromUser.id.toString(), JSON.stringify({
          promoCode,
          txid,
          publicKey: confirmedPublicKey,
          time: now,
          from: fromUser,
        }));

        if (promoCode) {
          await this.claimRecords.set(`${promoCode}:${fromUser.id}`, JSON.stringify({
            txid,
            time: now,
          }));
        }
      }

      await ctx.reply(ctx.t("account_created"), {
        parse_mode: "MarkdownV2",
      });
    } catch (e) {
      console.log("Error creating account", e);
      await ctx.reply(ctx.t("account_failed"));
    }
  }

  async waitPublicKey(conversation: Conversation<BotContext>, ctx: BotContext) {
    do {
      const publicKeyCtx = await conversation.wait();

      let publicKey = publicKeyCtx.message?.text;
      if (publicKey && this.validatePublicKey(publicKey)) {
        return publicKey;
      }

      if (publicKey) {
        if (this.isCommand(publicKey)) {
          return;
        }

        await ctx.reply(ctx.t("invalid_pubkey"));
      }
    } while (true);
  }

  isCommand(text: string) {
    return text.startsWith("/");
  }

  async confirmPublicKey(conversation: Conversation<BotContext>, ctx: BotContext, publicKey: string): Promise<false | string> {
    const confirmButton = InlineKeyboard.text(ctx.t("create_account"), "confirm");
    const cancelButton = InlineKeyboard.text(ctx.t("cancel"), "cancel");

    await ctx.reply(ctx.t("confirm_pubkey", {
      pubkey: publicKey
    }), {
      reply_markup: InlineKeyboard.from([[confirmButton], [cancelButton]]),
      parse_mode: "MarkdownV2",
    });

    do {
      let confirmedOrPublicKey = await this.waitConfirmOrNewPublicKey(conversation);

      if (typeof confirmedOrPublicKey === "boolean") {
        if (confirmedOrPublicKey) {
          return publicKey;
        }
        return false;
      }

      if (confirmedOrPublicKey && this.validatePublicKey(confirmedOrPublicKey)) {
        return await this.confirmPublicKey(conversation, ctx, confirmedOrPublicKey);
      }

      if (confirmedOrPublicKey) {
        if (this.isCommand(confirmedOrPublicKey)) {
          return false;
        }
        await ctx.reply(ctx.t("invalid_pubkey"));
      }
    } while (true);
  }

  async waitConfirmOrNewPublicKey(conversation: Conversation<BotContext>): Promise<boolean | string | undefined>{
    const confirmCtx = await conversation.wait();

    if (confirmCtx.update.callback_query?.data === "confirm") {
      return true;
    }

    if (confirmCtx.update.callback_query?.data === "cancel") {
      return false;
    }

    return confirmCtx.message?.text?.trim();
  }

  async createAccount(publicKey: string): Promise<string> {
    const action = {
      authorization: [
        {
          actor: this.creator,
          permission: 'active',
        }
      ],
      account: "eosio",
      name: "ramtransfer",
      data: {
        from: this.creator,
        to: this.contract,
        bytes: 1536,
        memo: `buy-${publicKey}`
      }
    };

    const resp = await this.api.transact({
      actions: [action],
    }, {
      blocksBehind: 3,
      expireSeconds: 30
    });

    return resp.transaction_id;
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