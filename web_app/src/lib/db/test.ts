import 'dotenv/config';
import { supabase } from './supabase';

async function testSupabaseConnection() {
    try {
        // Test the connection
        const { data, error } = await supabase
            .from('users')
            .select('*')
            .limit(1);

        if (error) {
            console.error('Supabase Error:', error.message);
            return;
        }

        console.log('Connection successful!');
        console.log('Sample data:', data);

    } catch (err) {
        console.error('Test failed:', err);
    }
}

// Run the test
testSupabaseConnection();