'use client';
import 'dotenv/config';
import { PrivyProvider } from '@privy-io/react-auth';
export default function Providers({ children }: { children: React.ReactNode }) {
    return (
      <PrivyProvider
        appId={'cm6n3pq6a00pn5hrrz4366rtn'}
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