import { useState, useEffect, useCallback } from 'react';
import { usePrivy } from '@privy-io/react-auth';
import { WalletService } from '@/lib/services/walletService';

interface WalletError {
  code: 'NO_WALLET' | 'SETUP_FAILED' | 'TRANSACTION_FAILED';
  message: string;
}

export function useWalletSetup() {
  const { user, ready, login } = usePrivy();
  const [serverWalletAddress, setServerWalletAddress] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<WalletError | null>(null);
  const [balance, setBalance] = useState<string | null>(null);

  const refreshBalance = useCallback(async () => {
    if (!serverWalletAddress) return;
    try {
      const balance = await WalletService.getWalletBalance(serverWalletAddress);
      setBalance(balance);
    } catch (err) {
      console.error('Error fetching balance:', err);
    }
  }, [serverWalletAddress]);

  const setupWallets = useCallback(async () => {
    const walletAccount = user?.linkedAccounts.find(
      account => account.type === 'wallet'
    ) as { address: string } | undefined;

    if (!walletAccount?.address) {
      setError({ code: 'NO_WALLET', message: 'No wallet connected' });
      setLoading(false);
      return;
    }

    try {
      const embeddedAddress = walletAccount.address;
      let serverAddress = await WalletService.getServerWalletByEmbedded(embeddedAddress);

      if (!serverAddress) {
        const newUser = await WalletService.createWalletMapping(embeddedAddress, user!.email?.address);
        serverAddress = newUser.server_wallet_address;
      }

      setServerWalletAddress(serverAddress);
      setError(null);
      await refreshBalance();
    } catch (err) {
      setError({
        code: 'SETUP_FAILED',
        message: err instanceof Error ? err.message : 'Failed to setup wallets'
      });
    } finally {
      setLoading(false);
    }
  }, [user, refreshBalance]);

  const sendTransaction = useCallback(async (to: string, amount: string) => {
    if (!serverWalletAddress) {
      throw new Error('No server wallet available');
    }

    try {
      const tx = await WalletService.sendTransaction(serverWalletAddress, {
        to,
        value: amount
      });
      await refreshBalance();
      return tx;
    } catch (err) {
      setError({
        code: 'TRANSACTION_FAILED',
        message: err instanceof Error ? err.message : 'Transaction failed'
      });
      throw err;
    }
  }, [serverWalletAddress, refreshBalance]);

  useEffect(() => {
    if (ready) {
      setupWallets();
    }
  }, [ready, setupWallets]);

  return {
    embeddedWallet: user?.linkedAccounts[0],
    serverWalletAddress,
    loading,
    error,
    isConnecting: !ready,
    balance,
    actions: {
      refreshBalance,
      sendTransaction,
      setupWallets,
      login
    }
  };
}