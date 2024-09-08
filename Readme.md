# EOS Assistant Bot

## Hosting

### Prerequisites

1. a [Cloudflare account](https://dash.cloudflare.com/login) with your workers subdomain [configured](https://dash.cloudflare.com/?account=workers).

2. Create a new Telegram bot

[View Telegram documentation](https://core.telegram.org/bots/features#creating-a-new-bot)

### Deploy

1. Modify `BOT_INFO` value

Open this link in your web browser:

```
https://api.telegram.org/bot<BOT_TOKEN>/getMe
```

Replace `<BOT_TOKEN>` with your bot token. If successful, you will see a JSON response similar to this:

```json
{
    "ok": true,
    "result": {
        "id": 1234567890,
        "is_bot": true,
        "first_name": "mybot",
        "username": "MyBot",
        "can_join_groups": true,
        "can_read_all_group_messages": false,
        "supports_inline_queries": true,
        "can_connect_to_business": false
    }
}
```

Now, open `wrangler.toml` in the root of your project and modify the variable `BOT_INFO` under `[vars]` section with the value from `result` object you get above like this:

```toml
[vars]
BOT_INFO = """{
    "id": 1234567890,
    "is_bot": true,
    "first_name": "mybot",
    "username": "MyBot",
    "can_join_groups": true,
    "can_read_all_group_messages": false,
    "supports_inline_queries": true,
    "can_connect_to_business": false
}"""
```

2. Modify creator account

Open `wrangler.toml` and modify the variable `CREATOR` under `[vars]` section with the creator account

3. Create Cloudflare KV namespace and bind

Use the below command to create cloudflare kv, then you can get the `id` of the KV namespace

```
npx wrangler kv namespace create <YOUR_NAMESPACE>
```

Let's create two KV namespaces. One for `KV_SESSION` and the other for `CLAIM_RECORDS`.

Open `wrangler.toml` and replace the variable `id` under `[[kv_namespaces]]` section with the `id` of the KV namespaces

4. Put sensitive environment variables

Set the telegram bot token:

```shell
npx wrangler secret put BOT_TOKEN
```

Set the private key of the creator

```shell
npx wrangler secret put PRIVATE_KEY
```

5. Deploy the worker

```shell
pnpm run deploy
```

6. Setting your webhook

```
https://api.telegram.org/bot<BOT_TOKEN>/setWebhook?url=https://<MY_BOT>.<MY_SUBDOMAIN>.workers.dev/
```

Replace `<BOT_TOKEN>` with your bot token, replace `<MY_BOT>` with the name of your worker, replace `<MY_SUBDOMAIN>` with your worker subdomain configured on the Cloudflare dashboard.

7. Testing your bot

Open your Telegram app, and start your bot. If it responds, it means you’re good to go!