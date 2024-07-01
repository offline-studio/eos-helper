import { webhookCallback } from "grammy";
import { createBot } from "./bot";
import { KvAdapter } from "@grammyjs/storage-cloudflare";

export interface Env {
	BOT_INFO: string;
	BOT_TOKEN: string;
	KV_SESSION: KVNamespace;

	CHAIN_ID: string;
	CHAIN_API_URL: string;
	CREATOR: string;
	CONTRACT: string;
	PRIVATE_KEY: string;
}
/**
 * Welcome to Cloudflare Workers! This is your first worker.
 *
 * - Run `npm run dev` in your terminal to start a development server
 * - Open a browser tab at http://localhost:8787/ to see your worker in action
 * - Run `npm run deploy` to publish your worker
 *
 * Bind resources to your worker in `wrangler.toml`. After adding bindings, a type definition for the
 * `Env` object can be regenerated with `npm run cf-typegen`.
 *
 * Learn more at https://developers.cloudflare.com/workers/
 */

export default {
	async fetch(request, env, ctx): Promise<Response> {
		const bot = createBot(env.BOT_TOKEN, {
			botConfig: {
				botInfo: JSON.parse(env.BOT_INFO),
			},
			sessionStorage: new KvAdapter(env.KV_SESSION),
			creator: env.CREATOR,
			chainId: env.CHAIN_ID,
			chainApiUrl: env.CHAIN_API_URL,
			contract: env.CONTRACT,
			privateKey: env.PRIVATE_KEY,
		});

		return webhookCallback(bot, "cloudflare-mod")(request);
	},
} satisfies ExportedHandler<Env>;
