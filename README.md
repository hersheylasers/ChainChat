# AI Agent with Privy Server Wallets Integration

This project demonstrates how to build an AI agent that can execute blockchain transactions using Privy server wallets for transaction signing and embedded wallets for user authentication.

## Features

- 🤖 AI Agent for processing user commands
- 🔐 Embedded wallets for user authentication
- 💼 Privy server wallets for secure transaction signing
- 🔄 Automatic wallet mapping and management
- 🎯 Built for Privy's track prize eligibility

## Tech Stack

- Next.js (Frontend Framework)
- TypeScript
- Coinbase CDP AgentKit
- Privy Server Wallets
- Hardhat (Smart Contract Development)
- Supabase (Database ORM)
- Ethers.js


## Prerequisites

- Node.js 16+
- PostgreSQL database
- Privy API Key
- Coinbase CDP API Key

## Environment Setup

Create a `.env.local` file in your project root:

```env
# Privy
PRIVY_API_KEY=your_privy_api_key

# Database
DATABASE_URL="postgresql://user:password@localhost:5432/dbname"

# Coinbase CDP
NEXT_PUBLIC_CDP_API_KEY=your_cdp_api_key

# General
NEXT_PUBLIC_ENABLE_TESTNETS=true
NEXT_PUBLIC_ALCHEMY_API_KEY=your_alchemy_api_key
```

## Installation

1. Install dependencies:
```bash
npm install
```

2. Initialize Prisma:
```bash
npx prisma init
npx prisma generate
npx prisma db push
```

## Project Structure

```
├── components/
│   ├── WalletAgent.tsx       # AI agent component
│   └── WalletHandler.tsx     # Wallet management component
├── lib/
│   ├── privy.ts             # Privy server wallet utilities
│   ├── wallet.ts            # Wallet management utilities
│   └── services/
│       └── walletService.ts # Wallet mapping service
├── pages/
│   ├── api/
│   │   └── wallet-actions.ts # API routes for wallet actions
│   └── index.tsx            # Main page
└── prisma/
    └── schema.prisma        # Database schema
```

## Key Components

### 1. Privy Server Wallet Integration

```typescript
import { PrivyClient } from '@privy-io/server-sdk';

export const PrivyWalletService = {
  async createWallet(userId: string) {
    const privy = new PrivyClient({
      apiKey: process.env.PRIVY_API_KEY!,
    });
    return privy.createWallet(userId);
  }
  // ... other wallet operations
};
```

### 2. Wallet Mapping

```typescript
// Database schema for wallet mapping
model User {
  id                    String   @id @default(uuid())
  embeddedWalletAddress String   @unique
  serverWalletAddress   String   @unique
  createdAt             DateTime @default(now())
}
```

### 3. API Routes

```typescript
// Example API route for wallet actions
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { userId, action, transaction } = req.body;

  // Handle different wallet actions
  switch (action) {
    case 'create':
      const wallet = await PrivyWalletService.createWallet(userId);
      return res.status(200).json(wallet);
    // ... other actions
  }
}
```

## Usage Examples

1. **Create a Server Wallet**
```typescript
const wallet = await PrivyWalletService.createWallet(userId);
```

2. **Send a Transaction**
```typescript
const tx = await PrivyWalletService.sendTransaction(userId, {
  to: recipientAddress,
  value: ethers.utils.parseEther("0.1").toString()
});
```

3. **Check Balance**
```typescript
const balance = await PrivyWalletService.getBalance(userId);
```

## Example Commands for the AI Agent

The AI agent can process natural language commands like:
- "Send 0.5 ETH to 0x..."
- "Check my wallet balance"
- "Deploy a new smart contract"
- "Swap tokens on Uniswap"

## Security Considerations

1. Keep your Privy API key secure
2. Never expose server wallet private keys
3. Implement proper rate limiting
4. Add transaction amount limits
5. Verify user authentication before actions

## Development

Run the development server:
```bash
npm run dev
```

Build for production:
```bash
npm run build
```

## Testing

```bash
npm run test
```

## Contributing

1. Fork the repository
2. Create your feature branch
3. Commit your changes
4. Push to the branch
5. Create a new Pull Request

## License

MIT

## Support

For questions about:
- Privy integration: Check [Privy Documentation](https://docs.privy.io)
- CDP AgentKit: Visit [CDP Documentation](https://docs.cdp.coinbase.com)