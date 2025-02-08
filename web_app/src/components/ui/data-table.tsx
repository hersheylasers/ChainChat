"use client"

import * as React from 'react'
import { type ColumnDef, type ColumnFiltersState, type SortingState, type VisibilityState, flexRender, getCoreRowModel, getFilteredRowModel, getPaginationRowModel, getSortedRowModel, useReactTable, type CellContext } from '@tanstack/react-table'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Input } from '@/components/ui/input'
import { DataTablePagination } from '@/components/ui/data-table-pagination'
import { Search, X } from 'lucide-react'
import Image from 'next/image'

export type MarketTableDataType = {
    name: string;
    image: string;
    symbol: string;
    current_price: number;
    price_change_percentage_24h: number;
    market_cap: number;
    total_volume: number;
}

interface DataTableProps<TData> {
    columns: ColumnDef<MarketTableDataType>[];
    data: TData[];
    userSearchColumn: string;
    inputPlaceHolder: string;
}

export function DataTable<TData, TValue>({
    columns,
    data,
    userSearchColumn,
    inputPlaceHolder,
}: DataTableProps<MarketTableDataType>) {
    const [sorting, setSorting] = React.useState<SortingState>([])
    const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>([])
    const [columnVisibility, setColumnVisibility] = React.useState<VisibilityState>({})
    const [rowSelection, setRowSelection] = React.useState({})

    const table = useReactTable({
        data: data,
        columns,
        onSortingChange: setSorting,
        onColumnFiltersChange: setColumnFilters,
        getCoreRowModel: getCoreRowModel(),
        getPaginationRowModel: getPaginationRowModel(),
        getSortedRowModel: getSortedRowModel(),
        getFilteredRowModel: getFilteredRowModel(),
        onColumnVisibilityChange: setColumnVisibility,
        onRowSelectionChange: setRowSelection,
        state: {
            sorting,
            columnFilters,
            columnVisibility,
            rowSelection,
        },
    })

    const clearSearch = () => {
        setColumnFilters([]);
        table.getColumn(userSearchColumn)?.setFilterValue('');
    };

    const renderCellContent = (cell: CellContext<MarketTableDataType, unknown>, row: { original: MarketTableDataType }) => {
        switch (cell.column.id) {
            case 'name':
                return (
                    <div className='flex flex-row space-x-2 items-center'>
                        <div>
                            <Image src={row.original.image} alt={row.original.name} width={35} height={35} />
                        </div>
                        <div className='flex flex-col justify-start'>
                            <div>{row.original.name}</div>
                            <div className='uppercase text-secondary-foreground'>({row.original.symbol})</div>
                        </div>
                    </div>
                );
            case 'current_price':
                return (
                    <div>
                        {row.original.current_price.toLocaleString('en-US', { style: 'currency', currency: 'USD' })}
                    </div>
                )
            case 'price_change_percentage_24h':
                return (
                    <div>
                        {row.original.price_change_percentage_24h > 0 ? (
                            <div className='text-green-500'>
                                +{row.original.price_change_percentage_24h.toFixed(2)}%
                            </div>
                        ) : (
                            <div className='text-red-500'>
                                {row.original.price_change_percentage_24h.toFixed(2)}%
                            </div>
                        )}
                    </div>
                )
            case 'total_volume':
                return (
                    <div>
                        {row.original.total_volume.toLocaleString('en-US', { style: 'currency', currency: 'USD' })}
                    </div>
                )
            case 'market_cap':
                return (
                    <div>
                        {row.original.market_cap.toLocaleString('en-US', { style: 'currency', currency: 'USD' })}
                    </div>
                )
            default:
                return cell.column.columnDef.cell ? flexRender(cell.column.columnDef.cell, cell) : null;
        }
    };

    return (
        <div className='flex flex-col space-y-2'>
            <div className='flex items-center'>
                <div className='flex w-full items-center'>
                    <div className='w-10 z-20 pl-1 text-center pointer-events-none flex items-center justify-center'><Search height={20} width={20} /></div>
                    <Input className='w-full md:max-w-md -mx-10 pl-10 pr-8 py-2 z-10 dark:border-white' placeholder={inputPlaceHolder}
                        value={(table.getColumn(userSearchColumn)?.getFilterValue() as string) ?? ''}
                        onChange={(event: React.ChangeEvent<HTMLInputElement>) =>
                            table.getColumn(userSearchColumn)?.setFilterValue(event.target.value)
                        } />
                    <div
                        onClick={clearSearch}
                        className='ml-2 z-20 cursor-pointer'
                    >
                        <X />
                    </div>
                </div>
            </div>
            <div className='rounded-md border dark:border-white'>
                <Table>
                    <TableHeader>
                        {table.getHeaderGroups().map((headerGroup) => (
                            <TableRow key={headerGroup.id}>
                                {headerGroup.headers.map((header) => (
                                    <TableHead key={header.id}>
                                        {header.isPlaceholder
                                            ? null
                                            : flexRender(
                                                header.column.columnDef.header,
                                                header.getContext()
                                            )}
                                    </TableHead>
                                ))}
                            </TableRow>
                        ))}
                    </TableHeader>
                    <TableBody>
                        {table.getRowModel().rows?.length ? (
                            table.getRowModel().rows.map((row) => (
                                <TableRow
                                    key={row.id}
                                    data-state={row.getIsSelected() && 'selected'}
                                >
                                    {row.getVisibleCells().map((cell) => (
                                        <TableCell key={cell.id}>
                                            {renderCellContent(cell.getContext(), row)}
                                        </TableCell>
                                    ))}
                                </TableRow>
                            ))
                        ) : (
                            <TableRow>
                                <TableCell colSpan={columns.length} className='h-24 text-center'>
                                    No results.
                                </TableCell>
                            </TableRow>
                        )}
                    </TableBody>
                </Table>
            </div>
            <div>
                <DataTablePagination table={table} />
            </div>
        </div>
    )
}
