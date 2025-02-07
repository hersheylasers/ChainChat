import { type NextRequest } from 'next/server'

export async function GET(request: NextRequest) {
    const CMC_PRO_API_KEY = process.env.COINMARKETCAP_API;
    const url = `https://pro-api.coinmarketcap.com/v1/cryptocurrency/listings/latest?limit=40&CMC_PRO_API_KEY=${CMC_PRO_API_KEY}`;

    try {
        const res = await fetch(url)
        const data = await res.json();
        return new Response(JSON.stringify(data), {
            status: 200,
            headers: { 'Content-Type': 'application/json' }
        })
    } catch (error) {
        return new Response(JSON.stringify({ error: 'Error fetching data' }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' }
        })
    }
}
