import { InlineKeyboard } from "grammy"

export const welcomeMessage = `Welcome, I'm EOS Assistant\\! I can help you create and manage EOS accounts\\.
You can use the following commands:

/free\\_account \\- Claim a free EOS account
`

export const requestPublicKeyMessage = `Please enter a public key for your account\\.
You can generate keypair by the offline webapp below:
`

export const openKeypairGeneratorButton = InlineKeyboard.webApp("Generate Keypair", "https://eos-keypair.pages.dev/");

export const publicKeyConfirmMessage = (pubkey: string)=> 
`Create free account with public key: 

\`${pubkey}\`

Make sure you have backed up the corresponding private key\\.

If you need to use other public keys, please enter directly\\.
`
