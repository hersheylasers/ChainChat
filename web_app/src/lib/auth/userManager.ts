import { supabase } from '../db/supabase';
import type { DbUser } from '../db/types';
import { getPrivyClient } from '../privy';

export type UserProfile = Omit<DbUser, 'updated_at'>;

export class UserManager {
  
  static async createUser(email: string, embeddedWalletAddress: string): Promise<UserProfile> {
    if (!embeddedWalletAddress) throw new Error('No wallet connected');

    // Create server wallet
    const privyClient = await getPrivyClient();
    const serverWallet = await privyClient.walletApi.create({
        chainType: 'ethereum'
    });

    // Create user in Supabase
    const { data: newUser, error } = await supabase
        .from('users')
        .insert({
            email,
            embedded_wallet_address: embeddedWalletAddress,
            server_wallet_address: serverWallet.address,
        })
        .select()
        .single();

    if (error) throw error;
    if (!newUser) throw new Error('Failed to create user');

    return newUser;
  }

  static async getUserByEmail(email: string): Promise<UserProfile | null> {
    const { data: user } = await supabase
      .from('users')
      .select('*')
      .eq('email', email)
      .single();

    return user;
  }

  static async getUserByEmbeddedWallet(address: string): Promise<UserProfile | null> {
    const { data: user } = await supabase
      .from('users')
      .select('*')
      .eq('embedded_wallet_address', address)
      .single();

    return user;
  }
  static async verifyUserAuthentication(address: string): Promise<boolean> {
    const user = await this.getUserByEmbeddedWallet(address);
    return !!user;
  }


}