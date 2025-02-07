"use client"

import React from 'react'
import MaxWidthWrapper from '@/components/MaxWidthWrapper'
import { useQueries } from '@tanstack/react-query'
import { toast } from 'sonner'
import type { ColumnDef } from '@tanstack/react-table'
import { DataTableColumnHeader } from '@/components/ui/data-table-column-header'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { DataTable } from '@/components/ui/data-table'

type MarketTableDataType = {
    name: string;
    symbol: string;
    quote: {
        USD: {
            price: number;
            volume_24h: number;
            market_cap: number;
        }
    }
}

const marketDataTableColumns: ColumnDef<MarketTableDataType>[] = [
    {
        accessorKey: 'name',
        header: ({ column }) => (
            <DataTableColumnHeader column={column} title='Name' />
        ),
    },
    {
        accessorKey: 'symbol',
        header: ({ column }) => (
            <DataTableColumnHeader column={column} title='Symbol' />
        ),
    },
    {
        accessorKey: 'quote.USD.price',
        header: ({ column }) => (
            <DataTableColumnHeader column={column} title='Price (in USD)' />
        ),
    },
    {
        accessorKey: 'quote.USD.volume_24h',
        header: ({ column }) => (
            <DataTableColumnHeader column={column} title='Volume (in USD)' />
        ),
    },
    {
        accessorKey: 'quote.USD.market_cap',
        header: ({ column }) => (
            <DataTableColumnHeader column={column} title='Market Cap (in USD)' />
        ),
    },
]

export default function Page() {
    const topCryptos = async () => {
        const response = await fetch('/api/cmc');

        if (!response.ok) {
            toast.error('Error fetching BIT10 Preformance. Please try again!');
        }

        let data = await response.json();
        return data;
    };

    const MarketActivityQuery = useQueries({
        queries: [
            {
                queryKey: ['marketActivity'],
                queryFn: () => topCryptos()
            },
        ]
    })

    const isLoading = MarketActivityQuery.some(query => query.isLoading);
    const marketData = MarketActivityQuery[0].data;
    console.log(marketData);

    return (
        <MaxWidthWrapper>
            {isLoading ? (
                <Card className='dark:border-white animate-fade-bottom-up-slow'>
                    <CardContent>
                        <div className='flex flex-col h-full space-y-2 pt-8'>
                            {['h-9 md:w-1/3', 'h-10', 'h-12', 'h-12', 'h-12', 'h-12', 'h-12', 'h-12', 'h-12'].map((classes, index) => (
                                <Skeleton key={index} className={classes} />
                            ))}
                        </div>
                    </CardContent>
                </Card>
            ) : (
                <Card className='dark:border-white animate-fade-bottom-up-slow'>
                    <CardHeader>
                        <div className='text-2xl md:text-4xl text-center md:text-start'>Markets</div>
                    </CardHeader>
                    <CardContent>
                        <DataTable
                            columns={marketDataTableColumns}
                            data={marketData.data}
                            userSearchColumn='name'
                            inputPlaceHolder='Search by name'
                        />
                    </CardContent>
                </Card>
            )}
        </MaxWidthWrapper>
    )
}
