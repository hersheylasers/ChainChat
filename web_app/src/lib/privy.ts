// lib/privy.ts
import { PrivyClient } from '@privy-io/server-auth';
import 'dotenv/config';


// Initialize PrivyClient with your API key
export const getPrivyClient = () => {
  return new PrivyClient( process.env.PRIVY_APP_ID!,
    process.env.PRIVY_APP_SECRET!,
    {
        walletApi: {
            authorizationPrivateKey: process.env.PRIVY_AUTHORIZATION_KEY!,
        }
    }
  );
};

// Helper functions for common Privy server wallet operations
export const PrivyWalletService = {
  // Create a new server wallet for a user
  async createWallet(userId: string) {
    const privy = getPrivyClient();
    const wallet = await privy.walletApi.create({
      chainType: 'ethereum'
    });
    return wallet;

  },


  // Get an existing server wallet
  async getWallet(userId: string) {
    const privy = getPrivyClient();
    const wallet = await privy.walletApi.getWallets({
        chainType: 'ethereum',
        limit:1,
    });
    return wallet;
  },

  // Send a transaction from the server wallet
  async sendTransaction(userId: string, transaction: {
    to: string;
    value: string;
    data?: string;
  }) {
    const privy = getPrivyClient();
    const walletsResponse = await privy.walletApi.getWallets({
      chainType: 'ethereum',
      limit: 1,
    });

    if (!walletsResponse.data[0]) {
      throw new Error('No wallet found');
    }

    const tx = await privy.walletApi.ethereum.sendTransaction({
      walletId: walletsResponse.data[0].id,
      caip2: 'eip155:84532',
      transaction: {
        to: transaction.to,

        value: transaction.value,
        chainId: 84532,
      },
    });

    return tx;
  },


  async getBalance(userId: string) {
    const privy = getPrivyClient();
    const wallet = await privy.walletApi.getWallets({
        chainType: 'ethereum',
        limit: 1,
    });




  }
};