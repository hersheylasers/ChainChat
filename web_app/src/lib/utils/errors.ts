export class WalletError extends Error {
  constructor(
    public code: string,
    message: string,
    public details?: any
  ) {
    super(message);
    this.name = 'WalletError';
  }
}

export function handleWalletError(error: unknown): WalletError {
  if (error instanceof WalletError) {
    return error;
  }

  if (error instanceof Error) {
    // Handle specific error types
    if (error.message.includes('insufficient funds')) {
      return new WalletError('INSUFFICIENT_FUNDS', 'Insufficient funds for transaction');
    }
    if (error.message.includes('nonce')) {
      return new WalletError('NONCE_ERROR', 'Transaction nonce error');
    }
    return new WalletError('UNKNOWN_ERROR', error.message);
  }

  return new WalletError('UNKNOWN_ERROR', 'An unknown error occurred');
}