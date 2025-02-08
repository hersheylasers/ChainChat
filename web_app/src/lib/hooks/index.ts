export { useAuth } from './useAuth';
export { useWalletSetup } from './useWalletSetup';
export type { WalletHookState } from './types';

// Types that might be shared between hooks
export interface WalletHookState {
    loading: boolean;
    error: Error | null;
    // ... other shared types
}