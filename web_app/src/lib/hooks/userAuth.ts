// hooks/useAuth.ts
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
      if (!privyUser) {
        setUserProfile(null);
        setLoading(false);
        return;

      }

      try {
        const userProfile = await UserManager.getUserByEmbeddedWallet(privyUser?.linkedAccounts[0]?.address);
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
    try {

      let profile = await UserManager.getUserByEmail(email);

      if (!profile) {
        profile = await UserManager.createUser(email);
      }

      setUserProfile(profile);
      return profile;

    } catch (error) {
      console.error('Login error:', error);
      throw error;
    }
  };

  const logout = async () => {
    setUserProfile(null);
  };


  return {
    user: userProfile,
    loading,
    login,
    logout,

  };
}