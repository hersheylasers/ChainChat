import { supabase } from '../db/supabase';
import { getPrivyClient } from '../privy';
import type { DbUser } from '../db/types';

export class WalletService {
  static async createWalletMapping(embeddedWalletAddress: string, email?: string) {
    try {
      // Create server wallet using Privy
      const privyClient = await getPrivyClient();
      const serverWallet = await privyClient.walletApi.create({
        chainType: 'ethereum'
      });

      // Create user record with wallet mapping
      const { data: user, error } = await supabase
        .from('users')
        .insert({
          email,
          embedded_wallet_address: embeddedWalletAddress,
          server_wallet_address: serverWallet.address,
        })
        .select()
        .single();

      if (error) throw error;
      return user;
    } catch (error) {
      console.error('Error creating wallet mapping:', error);
      throw error;
    }
  }

  static async getServerWalletByEmbedded(embeddedWalletAddress: string) {
    const { data: user } = await supabase
      .from('users')
      .select('server_wallet_address')
      .eq('embedded_wallet_address', embeddedWalletAddress)
      .single();
    return user?.server_wallet_address;
  }

  static async getEmbeddedWalletByServer(serverWalletAddress: string) {
    const { data: user } = await supabase
      .from('users')
      .select('embedded_wallet_address')
      .eq('server_wallet_address', serverWalletAddress)
      .single();
    return user?.embedded_wallet_address;
  }

  static async getUserByEitherWallet(walletAddress: string) {
    const { data: user } = await supabase
      .from('users')
      .select('*')
      .or(`embedded_wallet_address.eq.${walletAddress},server_wallet_address.eq.${walletAddress}`)
      .single();
    return user as DbUser | null;
  }
}