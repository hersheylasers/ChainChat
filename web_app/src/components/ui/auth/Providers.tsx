'use client';
import 'dotenv/config';
import { PrivyProvider } from '@privy-io/react-auth';
export default function Providers({ children }: { children: React.ReactNode }) {
    return (
      <PrivyProvider
        appId={process.env.PRIVY_APP_ID!}
        config={{
            loginMethods:['email','google','wallet','twitter', 'discord','github'],
          appearance: {
            theme: 'light',
            accentColor: '#676FFF',
            logo: 'https://your-logo-url',
          },
          embeddedWallets: {
            ethereum :{
            createOnLogin: 'users-without-wallets',
            },
          },
        }}
      >
        {children}
      </PrivyProvider>
    );
  }