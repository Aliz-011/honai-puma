'use client'

import { subMonths, intlFormat, subDays, endOfMonth, subYears } from "date-fns";
import { QueryObserverResult, RefetchOptions } from '@tanstack/react-query';

import { Table, TableBody, TableCell, TableHeader, TableRow } from '@/components/ui/table'
import Button from "./ui/button/Button";

export const TableNotFound = ({ date: selectedDate, daysBehind, tableName, refetch }: { date: Date, daysBehind: number, tableName: string, refetch: (options?: RefetchOptions) => Promise<QueryObserverResult<Regional[], Error>> }) => {
    const compactDate = subDays(selectedDate, daysBehind) // today - 2 days
    const lastDayOfSelectedMonth = endOfMonth(selectedDate);
    const isEndOfMonth = selectedDate.getDate() === lastDayOfSelectedMonth.getDate();

    // Last days of months
    const endOfCurrMonth = isEndOfMonth ? lastDayOfSelectedMonth : selectedDate;
    const endOfPrevMonth = isEndOfMonth ? endOfMonth(subMonths(selectedDate, 1)) : subMonths(selectedDate, 1);
    const endOfPrevYearSameMonth = isEndOfMonth ? endOfMonth(subYears(selectedDate, 1)) : subYears(selectedDate, 1);

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
                        {tableName}
                    </TableCell>
                </TableRow>
                <TableRow>
                    <TableCell isHeader className="px-5 py-3 min-w-[100px] font-medium border-r dark:border-r-gray-500 bg-blue-500 text-white text-center text-theme-xs">
                        Target
                    </TableCell>
                    <TableCell isHeader className="px-5 py-3 min-w-[100px] font-medium text-white bg-zinc-950 border-r last:border-r-0 dark:border-r-gray-700 text-center text-theme-xs">
                        {intlFormat(
                            endOfCurrMonth,
                            {
                                dateStyle: "medium",
                            },
                            { locale: "id-ID" }
                        )}
                    </TableCell>
                    <TableCell isHeader className="px-5 py-3 min-w-[100px] font-medium text-white bg-zinc-950 border-r last:border-r-0 dark:border-r-gray-700 text-center text-theme-xs">
                        {intlFormat(
                            endOfPrevMonth,
                            {
                                dateStyle: "medium",
                            },
                            { locale: "id-ID" }
                        )}
                    </TableCell>
                    <TableCell isHeader className="px-5 py-3 min-w-[100px] font-medium text-white bg-zinc-950 border-r last:border-r-0 dark:border-r-gray-700 text-center text-theme-xs">
                        {intlFormat(
                            endOfPrevYearSameMonth,
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
                        No Data. <Button onClick={() => refetch()} size="sm" variant="outline">Reload</Button>
                    </TableCell>
                </TableRow>
            </TableBody>
        </Table>
    )
}
