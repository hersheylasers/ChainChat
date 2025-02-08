export const config = {
    supabase: {
        url: process.env.NEXT_PUBLIC_SUPABASE_URL,
        anonKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    },
    privy: {
        appId: process.env.PRIVY_APP_ID,
        appSecret: process.env.PRIVY_APP_SECRET,
        authKey: process.env.PRIVY_AUTHORIZATION_KEY,
    }
} as const;

// Validate required environment variables
Object.entries(config).forEach(([service, vars]) => {
    Object.entries(vars).forEach(([key, value]) => {
        if (!value) {
            throw new Error(`Missing environment variable for ${service}.${key}`);
        }
    });
});