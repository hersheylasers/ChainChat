// lib/wallet/actions.ts
import { getPrivyClient } from '../privy';
import { UserManager } from '../auth/userManager';

export class WalletActions {
  static async executeTransaction(userEmail: string, txData: any) {
// Verify user exists and is authenticated
    const user = await UserManager.getUserByEmail(userEmail);
    if (!user) {
      throw new Error('User not found');
    }


    const privyClient = await getPrivyClient();
    const serverWallet = await privyClient.walletApi.getWallets({
        chainType: 'ethereum',
        limit: 1,
    });


    // 3. Sign and broadcast transaction
    const response = await privyClient.walletApi.ethereum.sendTransaction({
        walletId: serverWallet.data[0].id,
        caip2: 'eip155:11155111',
        transaction: txData
    });

    return response;
  }

  static async getWalletBalances(userEmail: string) {
    const user = await UserManager.getUserByEmail(userEmail);
    if (!user) {
      throw new Error('User not found');
    }

    const privyClient = await getPrivyClient();
    const serverWallet = await privyClient.walletApi.getWallets({
        chainType: 'ethereum',
        limit: 1,
    });

  }
}