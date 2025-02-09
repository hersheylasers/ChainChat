import { NextApiRequest, NextApiResponse } from 'next';
import { PrivyClient } from '@privy-io/server-auth';
import { TransactionRequest } from '@ethersproject/abstract-provider';
import 'dotenv/config';
import { Console } from 'console';

const privyClient = new PrivyClient(
    process.env.PRIVY_APP_ID!,
    process.env.PRIVY_APP_SECRET!,
    {
        walletApi: {
            authorizationPrivateKey: process.env.PRIVY_AUTHORIZATION_KEY!,
        }
    }
);

console.log(process.env.PRIVY_APP_ID);
console.log(process.env.PRIVY_APP_SECRET);
console.log(process.env.PRIVY_AUTHORIZATION_KEY);

interface WalletActionRequest {
  action: 'transfer' | 'approve' | 'swap';
  amount: string;
  recipient?: string;
  tokenAddress?: string;
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Verify user authentication
    const userId = await verifyUserAuth(req);
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { action, amount, recipient, tokenAddress } = req.body as WalletActionRequest;

    // Get user's wallet from Privy
    // const userWalletId = await privyClient.getUserByWalletAddress(user.id);

    // Prepare transaction based on action type
    let transaction: TransactionRequest;

    switch (action) {
      case 'transfer':
        transaction = {
          to: recipient,
          value: amount,
          gasLimit: '21000', // Basic ETH transfer gas limit
        };
        break;
      // Add other action types here
      default:
        return res.status(400).json({ error: 'Invalid action type' });
    }

    // Sign and send transaction using walletApi
    const response = await privyClient.walletApi.rpc({
        walletId: userId,
        method: 'eth_sendTransaction',
        caip: 'eip155:11155111',
        params: {
            transaction: {
                to: recipient,
                value: amount,
                gas: '0x5208',
            }
        }
    });

    if ('data' in response) {
        return res.status(200).json({
            success: true,
            transactionHash: response.data,
        });
    }

  } catch (error) {
    console.error('Wallet action error:', error);
    return res.status(500).json({
      error: 'Failed to process wallet action',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}

async function verifyUserAuth(req: NextApiRequest): Promise<string | null> {
    const authHeader = req.headers.authorization?.replace('Bearer','');
    if (!authHeader) return null;

    try {
        const token = authHeader.split(' ')[1];
        const verifiedUser = await privyClient.verifyAuthToken(token);
        return verifiedUser.userId;
    } catch (error) {
        console.error('Token verification error:', error);
        return null;
    }
}