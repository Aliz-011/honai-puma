'use client'

import { subMonths, intlFormat, subDays } from "date-fns";

import { Table, TableBody, TableCell, TableHeader, TableRow } from '@/components/ui/table'
import { useSelectDate } from "@/hooks/use-select-date";

export const TableNotFound = ({ date: selectedDate, daysBehind }: { date: Date, daysBehind: number }) => {
    const compactDate = subDays(selectedDate, daysBehind) // today - 2 days

    return (
        <Table>
            <TableHeader className="border-b border-gray-100 dark:border-white/[0.05]">
                <TableRow>
                    <TableCell
                        rowSpan={2}
                        isHeader
                        className="px-5 py-3 font-medium border-r dark:border-gray-700 text-white text-center text-theme-sm bg-rose-500"
                    >
                        Territory
                    </TableCell>
                    <TableCell
                        colSpan={10}
                        isHeader
                        className="px-5 py-3 font-medium border dark:bg-gray-900 text-gray-500 text-center text-theme-sm dark:text-white dark:border-gray-800"
                    >
                        Revenue New Sales
                    </TableCell>
                </TableRow>
                <TableRow>
                    <TableCell isHeader className="px-5 py-3 min-w-[100px] font-medium border-r dark:border-r-gray-500 bg-blue-500 text-white text-center text-theme-xs">
                        Target
                    </TableCell>
                    <TableCell isHeader className="px-5 py-3 min-w-[100px] font-medium text-white bg-zinc-950 border-r last:border-r-0 dark:border-r-gray-700 text-center text-theme-xs">
                        {intlFormat(
                            compactDate,
                            {
                                dateStyle: "medium",
                            },
                            { locale: "id-ID" }
                        )}
                    </TableCell>
                    <TableCell isHeader className="px-5 py-3 min-w-[100px] font-medium text-white bg-zinc-950 border-r last:border-r-0 dark:border-r-gray-700 text-center text-theme-xs">
                        {intlFormat(
                            subMonths(compactDate, 1),
                            {
                                dateStyle: "medium",
                            },
                            { locale: "id-ID" }
                        )}
                    </TableCell>
                    <TableCell isHeader className="px-5 py-3 min-w-[100px] font-medium text-white bg-zinc-950 border-r last:border-r-0 dark:border-r-gray-700 text-center text-theme-xs">
                        {intlFormat(
                            subMonths(compactDate, 12),
                            {
                                dateStyle: "medium",
                            },
                            { locale: "id-ID" }
                        )}
                    </TableCell>
                    <TableCell isHeader className="px-5 py-3 min-w-[100px] font-medium text-white bg-zinc-950 border-r last:border-r-0 dark:border-r-gray-700 text-center text-theme-xs">
                        YtD {selectedDate.getFullYear()}
                    </TableCell>
                    <TableCell isHeader className="px-5 py-3 min-w-[100px] font-medium text-white bg-zinc-950 border-r last:border-r-0 dark:border-r-gray-700 text-center text-theme-xs">
                        YtD {selectedDate.getFullYear() - 1}
                    </TableCell>
                    <TableCell isHeader className="px-5 py-3 min-w-[100px] font-medium text-white bg-zinc-950 border-r last:border-r-0 dark:border-r-gray-700 text-center text-theme-xs">
                        Ach
                    </TableCell>
                    <TableCell isHeader className="px-5 py-3 min-w-[100px] font-medium text-white bg-zinc-950 border-r last:border-r-0 dark:border-r-gray-700 text-center text-theme-xs">
                        MoM
                    </TableCell>
                    <TableCell isHeader className="px-5 py-3 min-w-[100px] font-medium text-white bg-zinc-950 border-r last:border-r-0 dark:border-r-gray-700 text-center text-theme-xs">
                        YoY
                    </TableCell>
                    <TableCell isHeader className="px-5 py-3 min-w-[100px] font-medium text-white bg-zinc-950 border-r last:border-r-0 dark:border-r-gray-700 text-center text-theme-xs">
                        YtD
                    </TableCell>

                </TableRow>
            </TableHeader>
            <TableBody className="divide-y divide-gray-100 dark:divide-white/[0.05]">
                {/* REGIONALS */}
                <TableRow>
                    <TableCell colSpan={12} className="px-5 py-4 sm:px-6 text-center border-r last:border-r-0 font-semibold bg-gray-50 text-theme-sm dark:text-white dark:border-gray-800 dark:bg-white/[0.03]">
                        No Data
                    </TableCell>
                </TableRow>
            </TableBody>
        </Table>
    )
}
