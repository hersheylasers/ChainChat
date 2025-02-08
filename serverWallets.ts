import { PrivyClient } from '@privy-io/server-auth';

const privy = new PrivyClient(
    process.env.PRIVY_APP_ID!,
    process.env.PRIVY_APP_SECRET!,
    {
        walletApi: {
            authorizationPrivateKey: process.env.PRIVY_AUTHORIZATION_KEY
        }
    }
);

export default privy;