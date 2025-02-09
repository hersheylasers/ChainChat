export interface WalletHookState {
    loading: boolean;
    error: Error | null;
}

export interface LinkedAccount {
    type: 'wallet' | 'email' | 'phone';
    address?: string;  // Optional since not all account types have addresses
    chainId?: number;
    connector?: string;
    verified: boolean;
}

export interface PrivyUser {
    id: string;
    linkedAccounts: LinkedAccount[];
    email?: {
        address: string;
        verified: boolean;
    };
}