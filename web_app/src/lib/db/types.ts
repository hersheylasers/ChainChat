export interface DbUser {
    id: string;
    email: string | null;
    embedded_wallet_address: string;
    server_wallet_address: string;
    username: string | null;
    created_at: string;
    updated_at: string;
}

export interface Database {
    public: {
        Tables: {
            users: {
                Row: DbUser;
                Insert: Omit<DbUser, 'id' | 'created_at' | 'updated_at'>;
                Update: Partial<Omit<DbUser, 'id'>>;
            };
        };
    };
}