import { useState, useEffect } from 'react';
import { usePrivy } from '@privy-io/react-auth';
import { UserManager } from '@/lib/auth/userManager';
import type { UserProfile } from '@/lib/auth/userManager';

export function useAuth() {
  const { user: privyUser } = usePrivy();
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadUser() {
      const walletAccount = privyUser?.linkedAccounts.find(acc => acc.type === 'wallet');
      if (!walletAccount?.address) {
        setUserProfile(null);
        setLoading(false);
        return;
      }

      try {
        const userProfile = await UserManager.getUserByEmbeddedWallet(walletAccount.address);
        setUserProfile(userProfile);
      } catch (error) {
        console.error('Error loading user:', error);
        setUserProfile(null);
      } finally {
        setLoading(false);
      }
    }

    loadUser();
  }, [privyUser]);

  const login = async (email: string) => {
    const walletAccount = privyUser?.linkedAccounts.find(acc => acc.type === 'wallet');
    if (!walletAccount?.address) {
      throw new Error('No wallet connected');
    }

    try {
      let profile = await UserManager.getUserByEmail(email);

      if (!profile) {
        profile = await UserManager.createUser(email, walletAccount.address);
      }

      setUserProfile(profile);
      return profile;
    } catch (error) {
      console.error('Login error:', error);
      throw error;
    }
  };

  return {
    user: userProfile,
    loading,
    login,
    logout: () => setUserProfile(null),
  };
}