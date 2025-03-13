'use client'

import React from 'react'
import { subMonths, intlFormat, subDays, format, endOfMonth, subYears, getDaysInMonth } from "date-fns";
import { ArrowDown, ArrowUp, Download } from 'lucide-react';
import { QueryObserverResult, RefetchOptions } from '@tanstack/react-query';

import { Table, TableBody, TableCell, TableHeader, TableRow } from '@/components/ui/table'
import { Skeleton } from '@/components/common/skeleton';
import ComponentCard from '@/components/common/ComponentCard';
import { TableNotFound } from '@/components/table-not-found';

import { cn, exportToExcel, formatToBillion, formatToPercentage, getGrowthColor, getAchGrowthColor } from '@/lib/utils';
import { useSelectBranch } from '@/hooks/use-select-branch';
import { useSelectSubbranch } from '@/hooks/use-select-subbranch';
import { useSelectCluster } from '@/hooks/use-select-cluster';
import { useSelectKabupaten } from '@/hooks/use-select-kabupaten';

type Params = {
    data?: Regional[];
    selectedDate: Date;
    latestUpdatedData: number;
    isLoading?: boolean;
    title: string;
    refetch: (options?: RefetchOptions) => Promise<QueryObserverResult<Regional[], Error>>
}

export const TableData = ({ latestUpdatedData, selectedDate, title, data: revenues, isLoading, refetch }: Params) => {
    const [sortField, setSortField] = React.useState<string | null>(null);
    const [sortDirection, setSortDirection] = React.useState('asc');

    const { branch: selectedBranch } = useSelectBranch()
    const { subbranch: selectedSubbranch } = useSelectSubbranch()
    const { cluster: selectedCluster } = useSelectCluster()
    const { kabupaten: selectedKabupaten } = useSelectKabupaten()

    const compactDate = subDays(selectedDate, latestUpdatedData) // today - 2 days
    const lastDayOfSelectedMonth = endOfMonth(selectedDate);
    const isEndOfMonth = selectedDate.getDate() === lastDayOfSelectedMonth.getDate();

    // Last days of months
    // const daysInCurrMonth = isEndOfMonth ? getDaysInMonth(compactDate) : getDaysInMonth(selectedDate)
    const daysInCurrMonth = getDaysInMonth(selectedDate)
    const currDate = parseInt(format(selectedDate, 'd'))

    const endOfCurrMonth = isEndOfMonth ? lastDayOfSelectedMonth : selectedDate;
    const endOfPrevMonth = isEndOfMonth ? endOfMonth(subMonths(selectedDate, 1)) : subMonths(selectedDate, 1);
    const endOfPrevYearSameMonth = isEndOfMonth ? endOfMonth(subYears(selectedDate, 1)) : subYears(selectedDate, 1);

    if (isLoading) {
        return (
            <div className="w-[1104px] overflow-x-auto remove-scrollbar">
                <div className="w-full">
                    <div className="flex flex-col space-y-3">
                        <Skeleton className="h-4 w-[200px]" />
                        <Skeleton className="h-[275px] w-[1104px] rounded-xl" />
                    </div>
                </div>
            </div>
        )
    }

    if (!revenues) {
        return <TableNotFound date={selectedDate} daysBehind={3} tableName={title} refetch={refetch} />
    }

    const handleDownload = () => {
        exportToExcel(revenues, title, selectedDate, compactDate)
    }

    const handleSort = (field: string) => {
        if (field === sortField) {
            setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
        } else {
            setSortField(field);
            setSortDirection('asc');
        }
    };

    const getValueByField = (item: any, field: string) => {
        switch (field) {
            case 'target': return item.currMonthTarget || 0;
            case 'currMonthRevenue': return item.currMonthRevenue || 0;
            case 'prevMonthRevenue': return item.prevMonthRevenue || 0;
            case 'prevYearCurrMonthRevenue': return item.prevYearCurrMonthRevenue || 0;
            case 'currYtdRevenue': return item.currYtdRevenue || 0;
            case 'prevYtdRevenue': return item.prevYtdRevenue || 0;
            case 'achFM': return (item.currMonthRevenue / item.currMonthTarget * 100) || 0;
            case 'achDRR': return ((item.currMonthRevenue / currDate) * daysInCurrMonth) / item.currMonthTarget * 100 || 0;
            case 'mom': return ((item.currMonthRevenue - item.prevMonthRevenue) / item.prevMonthRevenue * 100) || 0;
            case 'yoy': return ((item.currMonthRevenue - item.prevYearCurrMonthRevenue) / item.prevYearCurrMonthRevenue * 100) || 0;
            case 'ytd': return ((item.currYtdRevenue - item.prevYtdRevenue) / item.prevYtdRevenue * 100) || 0;
            default: return 0;
        }
    };

    const sortCollection = (collection: any) => {
        if (!sortField) return collection;

        return [...collection].toSorted((a, b) => {
            const aValue = getValueByField(a, sortField);
            const bValue = getValueByField(b, sortField);

            // For other numeric fields, sort normally
            return sortDirection === 'asc'
                ? aValue - bValue
                : bValue - aValue;
        });
    };

    const applySorting = (revenues: Regional[]) => {
        if (!sortField) return revenues;

        return revenues.map(regional => ({
            ...regional,
            branches: sortCollection(regional.branches).map((branch: Branch) => ({
                ...branch,
                subbranches: sortCollection(branch.subbranches).map((subbranch: Subbranch) => ({
                    ...subbranch,
                    clusters: sortCollection(subbranch.clusters).map((cluster: Cluster) => ({
                        ...cluster,
                        kabupatens: sortCollection(cluster.kabupatens)
                    }))
                }))
            }))
        }));
    };

    const filteredRevenues = revenues.map(regional => ({
        ...regional,
        branches: regional.branches.filter((branch) => !selectedBranch || branch.name === selectedBranch)
            .map((branch) => ({
                ...branch,
                subbranches: branch.subbranches
                    .filter((subbranch) => !selectedSubbranch || subbranch.name === selectedSubbranch)
                    .map((subbranch) => ({
                        ...subbranch,
                        clusters: subbranch.clusters
                            .filter((cluster) => !selectedCluster || cluster.name === selectedCluster)
                            .map((cluster) => ({
                                ...cluster,
                                kabupatens: cluster.kabupatens
                                    .filter((kabupaten) => !selectedKabupaten || kabupaten.name === selectedKabupaten)
                            }))
                    }))
            }))
    }))

    const sortedRevenues = applySorting(filteredRevenues);

    // Sort indicator component
    const SortIndicator = ({ field }: { field: string }) => {
        if (sortField !== field) return null;
        return <button>{sortDirection === 'asc' ? <ArrowUp className='size-4' /> : <ArrowDown className='size-4' />}</button>;
    };

    return (
        <div className="w-fit overflow-x-auto remove-scrollbar">
            <ComponentCard title={title} desc={<button
                className='inline-flex items-center justify-center gap-2 whitespace-nowrap font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0 border border-input bg-background shadow-sm hover:bg-accent hover:text-accent-foreground h-8 rounded-md px-3 text-xs dark:bg-gray-800 dark:border-gray-700 dark:hover:bg-gray-700 dark:text-gray-100'
                onClick={handleDownload}
            >
                <Download className='size-4' /> xlsx
            </button>}>
                <Table className='w-full'>
                    <TableHeader className="border-b border-gray-100 dark:border-white/[0.05]">
                        <TableRow>
                            <TableCell
                                rowSpan={2}
                                isHeader
                                className="px-1.5 font-medium border-r dark:border-gray-700 text-white text-center text-theme-sm bg-rose-700"
                            >
                                Territory
                            </TableCell>
                            <TableCell
                                colSpan={11}
                                isHeader
                                className="px-1.5 font-medium border bg-blue-700 text-gray-50 text-center text-theme-sm dark:text-white dark:border-gray-800"
                            >
                                {title}
                            </TableCell>
                        </TableRow>
                        <TableRow>
                            <TableCell isHeader className="font-medium border-r dark:border-r-gray-700 bg-blue-500 text-white text-theme-xs p-0.5 border-gray-300 text-center whitespace-nowrap">
                                Target
                            </TableCell>
                            <TableCell onClick={() => handleSort('currMonthRevenue')} isHeader className="px-0.5 py-1 whitespace-nowrap font-medium text-white bg-zinc-950 border-r last:border-r-0 dark:border-r-gray-700 text-center text-theme-xs">
                                {intlFormat(
                                    endOfCurrMonth,
                                    {
                                        dateStyle: "medium",
                                    },
                                    { locale: "id-ID" }
                                )}
                            </TableCell>
                            <TableCell onClick={() => handleSort('prevMonthRevenue')} isHeader className="px-0.5 py-1 whitespace-nowrap font-medium text-white bg-zinc-950 border-r last:border-r-0 dark:border-r-gray-700 text-center text-theme-xs">
                                {intlFormat(
                                    endOfPrevMonth,
                                    {
                                        dateStyle: "medium",
                                    },
                                    { locale: "id-ID" }
                                )}
                            </TableCell>
                            <TableCell onClick={() => handleSort('prevYearCurrMonthRevenue')} isHeader className="px-0.5 py-1 whitespace-nowrap font-medium text-white bg-zinc-950 border-r last:border-r-0 dark:border-r-gray-700 text-center text-theme-xs">
                                {intlFormat(
                                    endOfPrevYearSameMonth,
                                    {
                                        dateStyle: "medium",
                                    },
                                    { locale: "id-ID" }
                                )}
                            </TableCell>
                            <TableCell onClick={() => handleSort('currYtdRevenue')} isHeader className="px-0.5 py-1 whitespace-nowrap font-medium text-white bg-zinc-950 border-r last:border-r-0 dark:border-r-gray-700 text-center text-theme-xs">
                                YtD {selectedDate.getFullYear()}
                            </TableCell>
                            <TableCell onClick={() => handleSort('prevYtdRevenue')} isHeader className="px-0.5 py-1 whitespace-nowrap font-medium text-white bg-zinc-950 border-r last:border-r-0 dark:border-r-gray-700 text-center text-theme-xs">
                                YtD {selectedDate.getFullYear() - 1}
                            </TableCell>
                            <TableCell onClick={() => handleSort('achFM')} isHeader className="p-1 whitespace-nowrap font-medium text-white bg-zinc-950 border-r last:border-r-0 dark:border-r-gray-700 text-center text-theme-xs">
                                <div className='flex items-center gap-x-1 justify-center'>Ach FM <SortIndicator field="achFM" /></div>
                            </TableCell>
                            <TableCell onClick={() => handleSort('achDRR')} isHeader className="p-1 whitespace-nowrap font-medium text-white bg-zinc-950 border-r last:border-r-0 dark:border-r-gray-700 text-center text-theme-xs">
                                <div className='flex items-center gap-x-1 justify-center'>Ach DRR <SortIndicator field="achDRR" /></div>
                            </TableCell>
                            <TableCell onClick={() => handleSort('mom')} isHeader className="p-1 whitespace-nowrap font-medium text-white bg-zinc-950 border-r last:border-r-0 dark:border-r-gray-700 text-center text-theme-xs">
                                <div className='flex items-center gap-x-1 justify-center'>MoM <SortIndicator field="mom" /></div>
                            </TableCell>
                            <TableCell onClick={() => handleSort('yoy')} isHeader className="p-1 whitespace-nowrap font-medium text-white bg-zinc-950 border-r last:border-r-0 dark:border-r-gray-700 text-center text-theme-xs">
                                <div className='flex items-center gap-x-1 justify-center'>YoY <SortIndicator field="yoy" /></div>
                            </TableCell>
                            <TableCell onClick={() => handleSort('ytd')} isHeader className="p-1 whitespace-nowrap font-medium text-white bg-zinc-950 border-r last:border-r-0 dark:border-r-gray-700 text-center text-theme-xs">
                                <div className='flex items-center gap-x-1 justify-center'>YtD <SortIndicator field="ytd" /></div>
                            </TableCell>

                        </TableRow>
                    </TableHeader>
                    <TableBody className="divide-y divide-gray-100 dark:divide-white/[0.05]">
                        {/* REGIONALS */}
                        <TableRow>
                            <TableCell colSpan={13} className="px-1 py-2 border-r last:border-r-0 text-start font-semibold bg-gray-50 text-theme-sm dark:text-white dark:border-gray-800 dark:bg-white/[0.03]">
                                Regional
                            </TableCell>
                        </TableRow>
                        {sortedRevenues.map((regional, regionalIndex) => (
                            <React.Fragment key={regionalIndex}>
                                <TableRow>
                                    <TableCell className="px-1 py-0.5 border-r last:border-r-0 text-start font-normal text-theme-xs dark:text-white dark:border-gray-800 ">
                                        {regional.name}
                                    </TableCell>
                                    <TableCell className="px-1 py-0.5 border-r last:border-r-0 text-end text-theme-xs dark:text-white dark:border-gray-800 tabular-nums">
                                        <span className='text-end'>{formatToBillion(regional.currMonthTarget)}</span>
                                    </TableCell>
                                    <TableCell className="px-1 py-0.5 border-r last:border-r-0 text-end text-theme-xs dark:text-white dark:border-gray-800 tabular-nums">
                                        <span className='text-end'>{formatToBillion(regional.currMonthRevenue)}</span>
                                    </TableCell>
                                    <TableCell className="px-1 py-0.5 border-r last:border-r-0 text-end text-theme-xs dark:text-white dark:border-gray-800 tabular-nums">
                                        <span className='text-end'>{formatToBillion(regional.prevMonthRevenue)}</span>
                                    </TableCell>
                                    <TableCell className="px-1 py-0.5 border-r last:border-r-0 text-end text-theme-xs dark:text-white dark:border-gray-800 tabular-nums">
                                        <span>{formatToBillion(regional.prevYearCurrMonthRevenue)}</span>
                                    </TableCell>
                                    <TableCell className="px-1 py-0.5 border-r last:border-r-0 text-end text-theme-xs dark:text-white dark:border-gray-800 tabular-nums">
                                        <span>{formatToBillion(regional.currYtdRevenue)}</span>
                                    </TableCell>
                                    <TableCell className="px-1 py-0.5 border-r last:border-r-0 text-end text-theme-xs dark:text-white dark:border-gray-800 tabular-nums">
                                        <span>{formatToBillion(regional.prevYtdRevenue)}</span>
                                    </TableCell>
                                    {/* ACH FM */}
                                    <TableCell className="px-1 py-0.5 border-r last:border-r-0 text-end text-theme-xs dark:text-white dark:border-gray-800 tabular-nums">
                                        <span className={cn(getAchGrowthColor(regional.currMonthRevenue / regional.currMonthTarget * 100) ? 'text-green-500' : 'text-rose-500')}>
                                            {formatToPercentage(regional.currMonthRevenue / regional.currMonthTarget * 100)}%
                                        </span>
                                    </TableCell>
                                    {/* ACH DDR */}
                                    <TableCell className="px-1 py-0.5 border-r last:border-r-0 text-end text-theme-xs dark:text-white dark:border-gray-800 tabular-nums">
                                        <span className={cn(getAchGrowthColor(((regional.currMonthRevenue / currDate) * daysInCurrMonth) / regional.currMonthTarget * 100) ? 'text-green-500' : 'text-rose-500')}>
                                            {formatToPercentage(((regional.currMonthRevenue / currDate) * daysInCurrMonth) / regional.currMonthTarget * 100)}%
                                        </span>
                                    </TableCell>
                                    {/* MoM */}
                                    <TableCell className={cn("px-1 py-0.5 border-r last:border-r-0 text-end text-theme-xs font-medium dark:border-gray-800")}>
                                        <span className={cn(getGrowthColor(((regional.currMonthRevenue - regional.prevMonthRevenue) / regional.prevMonthRevenue * 100)) ? 'text-green-500' : 'text-rose-500')}>
                                            {formatToPercentage((regional.currMonthRevenue - regional.prevMonthRevenue) / regional.prevMonthRevenue * 100)}%
                                        </span>
                                    </TableCell>
                                    {/* YoY */}
                                    <TableCell className="px-1 py-0.5 border-r last:border-r-0 text-end text-theme-xs dark:text-white dark:border-gray-800 tabular-nums">
                                        <span className={cn(getGrowthColor(((regional.currMonthRevenue - regional.prevYearCurrMonthRevenue) / regional.prevYearCurrMonthRevenue * 100)) ? 'text-green-500' : 'text-rose-500')}>
                                            {formatToPercentage(((regional.currMonthRevenue - regional.prevYearCurrMonthRevenue) / regional.prevYearCurrMonthRevenue * 100))}%
                                        </span>
                                    </TableCell>
                                    {/* YtD */}
                                    <TableCell className="px-1 py-0.5 border-r last:border-r-0 text-end text-theme-xs dark:text-white dark:border-gray-800 tabular-nums">
                                        <span className={cn(getGrowthColor(((regional.currYtdRevenue - regional.prevYtdRevenue) / regional.prevYtdRevenue * 100)) ? 'text-green-500' : 'text-rose-500')}>
                                            {formatToPercentage((regional.currYtdRevenue - regional.prevYtdRevenue) / regional.prevYtdRevenue * 100)}%
                                        </span>
                                    </TableCell>
                                </TableRow>

                                {/* BRANCH */}
                                <TableRow>
                                    <TableCell colSpan={13} className="px-1 py-0.5 border-r last:border-r-0 text-start font-semibold bg-gray-200 dark:text-white dark:border-gray-800 dark:bg-white/[0.03] text-theme-sm">
                                        Branch
                                    </TableCell>
                                </TableRow>
                                {regional.branches.map((branch: any, branchIndex: number) => (
                                    <React.Fragment key={`branch-${regionalIndex}_${branchIndex}`}>
                                        <TableRow>
                                            <TableCell className="px-1 py-0.5 border-r last:border-r-0 text-start font-normal text-theme-xs dark:text-white dark:border-gray-800">
                                                {branch.name}
                                            </TableCell>
                                            <TableCell className="px-1 py-0.5 border-r last:border-r-0 text-end text-theme-xs dark:text-white dark:border-gray-800 tabular-nums">
                                                <span>{formatToBillion(branch.currMonthTarget)}</span>
                                            </TableCell>
                                            <TableCell className="px-1 py-0.5 border-r last:border-r-0 text-end text-theme-xs dark:text-white dark:border-gray-800 tabular-nums">
                                                <span>{formatToBillion(branch.currMonthRevenue)}</span>
                                            </TableCell>
                                            <TableCell className="px-1 py-0.5 border-r last:border-r-0 text-end text-theme-xs dark:text-white dark:border-gray-800 tabular-nums">
                                                <span>{formatToBillion(branch.prevMonthRevenue)}</span>
                                            </TableCell>
                                            <TableCell className="px-1 py-0.5 border-r last:border-r-0 text-end text-theme-xs dark:text-white dark:border-gray-800 tabular-nums">
                                                <span>{formatToBillion(branch.prevYearCurrMonthRevenue)}</span>
                                            </TableCell>
                                            <TableCell className="px-1 py-0.5 border-r last:border-r-0 text-end text-theme-xs dark:text-white dark:border-gray-800 tabular-nums">
                                                <span>{formatToBillion(branch.currYtdRevenue)}</span>
                                            </TableCell>
                                            <TableCell className="px-1 py-0.5 border-r last:border-r-0 text-end text-theme-xs dark:text-white dark:border-gray-800 tabular-nums">
                                                <span>{formatToBillion(branch.prevYtdRevenue)}</span>
                                            </TableCell>
                                            {/* ACH FM */}
                                            <TableCell className="px-1 py-0.5 border-r last:border-r-0 text-end text-theme-xs dark:text-white dark:border-gray-800 tabular-nums">
                                                <span className={cn(getAchGrowthColor(branch.currMonthRevenue / branch.currMonthTarget * 100) ? 'text-green-500' : 'text-rose-500')}>
                                                    {formatToPercentage(branch.currMonthRevenue / branch.currMonthTarget * 100)}%
                                                </span>
                                            </TableCell>
                                            {/* ACH DDR */}
                                            <TableCell className="px-1 py-0.5 border-r last:border-r-0 text-end text-theme-xs dark:text-white dark:border-gray-800 tabular-nums">
                                                <span className={cn(getAchGrowthColor(((branch.currMonthRevenue / currDate) * daysInCurrMonth) / branch.currMonthTarget * 100) ? 'text-green-500' : 'text-rose-500')}>
                                                    {formatToPercentage(((branch.currMonthRevenue / currDate) * daysInCurrMonth) / branch.currMonthTarget * 100)}%
                                                </span>
                                            </TableCell>
                                            {/* MoM */}
                                            <TableCell className={cn("px-1 py-0.5 border-r last:border-r-0 text-end text-theme-xs font-medium dark:border-gray-800")}>
                                                <span className={cn(getGrowthColor(((branch.currMonthRevenue - branch.prevMonthRevenue) / branch.prevMonthRevenue * 100)) ? 'text-green-500' : 'text-rose-500')}>
                                                    {formatToPercentage((branch.currMonthRevenue - branch.prevMonthRevenue) / branch.prevMonthRevenue * 100)}%
                                                </span>
                                            </TableCell>
                                            {/* YoY */}
                                            <TableCell className="px-1 py-0.5 border-r last:border-r-0 text-end text-theme-xs dark:text-white dark:border-gray-800 tabular-nums">
                                                <span className={cn(getGrowthColor(((branch.currMonthRevenue - branch.prevYearCurrMonthRevenue) / branch.prevYearCurrMonthRevenue * 100)) ? 'text-green-500' : 'text-rose-500')}>
                                                    {formatToPercentage(((branch.currMonthRevenue - branch.prevYearCurrMonthRevenue) / branch.prevYearCurrMonthRevenue * 100))}%
                                                </span>
                                            </TableCell>
                                            {/* YtD */}
                                            <TableCell className="px-1 py-0.5 border-r last:border-r-0 text-end text-theme-xs dark:text-white dark:border-gray-800 tabular-nums">
                                                <span className={cn(getGrowthColor(((branch.currYtdRevenue - branch.prevYtdRevenue) / branch.prevYtdRevenue * 100)) ? 'text-green-500' : 'text-rose-500')}>
                                                    {formatToPercentage((branch.currYtdRevenue - branch.prevYtdRevenue) / branch.prevYtdRevenue * 100)}%
                                                </span>
                                            </TableCell>
                                        </TableRow>
                                    </React.Fragment>
                                ))}

                                {/* SUBBRANCH */}
                                <TableRow>
                                    <TableCell colSpan={13} className="px-1 py-0.5 border-r last:border-r-0 text-start font-semibold bg-gray-200 dark:text-white dark:border-gray-800 dark:bg-white/[0.03] text-theme-sm">
                                        Subbranch
                                    </TableCell>
                                </TableRow>
                                {regional.branches.map((branch: any, branchIndex: number) =>
                                    branch.subbranches.map((subbranch: any, subbranchIndex: number) => (
                                        <React.Fragment key={`branch-${regionalIndex}_${branchIndex}_${subbranchIndex}`}>
                                            <TableRow>
                                                <TableCell className="px-1 py-0.5 border-r last:border-r-0 text-start font-normal text-theme-xs dark:text-white dark:border-gray-800">
                                                    {subbranch.name}
                                                </TableCell>
                                                <TableCell className="px-1 py-0.5 border-r last:border-r-0 text-end text-theme-xs dark:text-white dark:border-gray-800 tabular-nums">
                                                    <span>{formatToBillion(subbranch.currMonthTarget)}</span>
                                                </TableCell>
                                                <TableCell className="px-1 py-0.5 border-r last:border-r-0 text-end text-theme-xs dark:text-white dark:border-gray-800 tabular-nums">
                                                    <span>{formatToBillion(subbranch.currMonthRevenue)}</span>
                                                </TableCell>
                                                <TableCell className="px-1 py-0.5 border-r last:border-r-0 text-end text-theme-xs dark:text-white dark:border-gray-800 tabular-nums">
                                                    <span>{formatToBillion(subbranch.prevMonthRevenue)}</span>
                                                </TableCell>
                                                <TableCell className="px-1 py-0.5 border-r last:border-r-0 text-end text-theme-xs dark:text-white dark:border-gray-800 tabular-nums">
                                                    <span>{formatToBillion(subbranch.prevYearCurrMonthRevenue)}</span>
                                                </TableCell>
                                                <TableCell className="px-1 py-0.5 border-r last:border-r-0 text-end text-theme-xs dark:text-white dark:border-gray-800 tabular-nums">
                                                    <span>{formatToBillion(subbranch.currYtdRevenue)}</span>
                                                </TableCell>
                                                <TableCell className="px-1 py-0.5 border-r last:border-r-0 text-end text-theme-xs dark:text-white dark:border-gray-800 tabular-nums">
                                                    <span>{formatToBillion(subbranch.prevYtdRevenue)}</span>
                                                </TableCell>
                                                {/* ACH FM */}
                                                <TableCell className="px-1 py-0.5 border-r last:border-r-0 text-end text-theme-xs dark:text-white dark:border-gray-800 tabular-nums">
                                                    <span className={cn(getAchGrowthColor(subbranch.currMonthRevenue / subbranch.currMonthTarget * 100) ? 'text-green-500' : 'text-rose-500')}>
                                                        {formatToPercentage(subbranch.currMonthRevenue / subbranch.currMonthTarget * 100)}%
                                                    </span>
                                                </TableCell>
                                                {/* ACH DDR */}
                                                <TableCell className="px-1 py-0.5 border-r last:border-r-0 text-end text-theme-xs dark:text-white dark:border-gray-800 tabular-nums">
                                                    <span className={cn(getAchGrowthColor(((subbranch.currMonthRevenue / currDate) * daysInCurrMonth) / subbranch.currMonthTarget * 100) ? 'text-green-500' : 'text-rose-500')}>
                                                        {formatToPercentage(((subbranch.currMonthRevenue / currDate) * daysInCurrMonth) / subbranch.currMonthTarget * 100)}%
                                                    </span>
                                                </TableCell>
                                                {/* MoM */}
                                                <TableCell className={cn("px-1 py-0.5 border-r last:border-r-0 text-end text-theme-xs font-medium dark:border-gray-800")}>
                                                    <span className={cn(getGrowthColor(((subbranch.currMonthRevenue - subbranch.prevMonthRevenue) / subbranch.prevMonthRevenue * 100)) ? 'text-green-500' : 'text-rose-500')}>
                                                        {formatToPercentage((subbranch.currMonthRevenue - subbranch.prevMonthRevenue) / subbranch.prevMonthRevenue * 100)}%
                                                    </span>
                                                </TableCell>
                                                {/* YoY */}
                                                <TableCell className="px-1 py-0.5 border-r last:border-r-0 text-end text-theme-xs dark:text-white dark:border-gray-800 tabular-nums">
                                                    <span className={cn(getGrowthColor(((subbranch.currMonthRevenue - subbranch.prevYearCurrMonthRevenue) / subbranch.prevYearCurrMonthRevenue * 100)) ? 'text-green-500' : 'text-rose-500')}>
                                                        {formatToPercentage(((subbranch.currMonthRevenue - subbranch.prevYearCurrMonthRevenue) / subbranch.prevYearCurrMonthRevenue * 100))}%
                                                    </span>
                                                </TableCell>
                                                {/* YtD */}
                                                <TableCell className="px-1 py-0.5 border-r last:border-r-0 text-end text-theme-xs dark:text-white dark:border-gray-800 tabular-nums">
                                                    <span className={cn(getGrowthColor(((subbranch.currYtdRevenue - subbranch.prevYtdRevenue) / subbranch.prevYtdRevenue * 100)) ? 'text-green-500' : 'text-rose-500')}>
                                                        {formatToPercentage((subbranch.currYtdRevenue - subbranch.prevYtdRevenue) / subbranch.prevYtdRevenue * 100)}%
                                                    </span>
                                                </TableCell>
                                            </TableRow>
                                        </React.Fragment>
                                    )))}

                                <TableRow>
                                    <TableCell colSpan={13} className="px-1 py-0.5 border-r last:border-r-0 text-start font-semibold bg-gray-200 dark:text-white dark:border-gray-800 dark:bg-white/[0.03] text-theme-sm">
                                        Cluster
                                    </TableCell>
                                </TableRow>
                                {regional.branches.map((branch: any, branchIndex: number) =>
                                    branch.subbranches.map((subbranch: any, subbranchIndex: number) =>
                                        subbranch.clusters.map((cluster: any, clusterIndex: number) => (
                                            <React.Fragment key={`branch-${regionalIndex}_${branchIndex}_${subbranchIndex}_${clusterIndex}`}>
                                                <TableRow>
                                                    <TableCell className="px-1 py-0.5 border-r last:border-r-0 text-start font-normal text-theme-xs dark:text-white dark:border-gray-800">
                                                        {cluster.name}
                                                    </TableCell>
                                                    <TableCell className="px-1 py-0.5 border-r last:border-r-0 text-end text-theme-xs dark:text-white dark:border-gray-800 tabular-nums">
                                                        <span>{formatToBillion(cluster.currMonthTarget)}</span>
                                                    </TableCell>
                                                    <TableCell className="px-1 py-0.5 border-r last:border-r-0 text-end text-theme-xs dark:text-white dark:border-gray-800 tabular-nums">
                                                        <span>{formatToBillion(cluster.currMonthRevenue)}</span>
                                                    </TableCell>
                                                    <TableCell className="px-1 py-0.5 border-r last:border-r-0 text-end text-theme-xs dark:text-white dark:border-gray-800 tabular-nums">
                                                        <span>{formatToBillion(cluster.prevMonthRevenue)}</span>
                                                    </TableCell>
                                                    <TableCell className="px-1 py-0.5 border-r last:border-r-0 text-end text-theme-xs dark:text-white dark:border-gray-800 tabular-nums">
                                                        <span>{formatToBillion(cluster.prevYearCurrMonthRevenue)}</span>
                                                    </TableCell>
                                                    <TableCell className="px-1 py-0.5 border-r last:border-r-0 text-end text-theme-xs dark:text-white dark:border-gray-800 tabular-nums">
                                                        <span>{formatToBillion(cluster.currYtdRevenue)}</span>
                                                    </TableCell>
                                                    <TableCell className="px-1 py-0.5 border-r last:border-r-0 text-end text-theme-xs dark:text-white dark:border-gray-800 tabular-nums">
                                                        <span>{formatToBillion(cluster.prevYtdRevenue)}</span>
                                                    </TableCell>
                                                    {/* ACH FM */}
                                                    <TableCell className="px-1 py-0.5 border-r last:border-r-0 text-end text-theme-xs dark:text-white dark:border-gray-800 tabular-nums">
                                                        <span className={cn(getAchGrowthColor(cluster.currMonthRevenue / cluster.currMonthTarget * 100) ? 'text-green-500' : 'text-rose-500')}>
                                                            {formatToPercentage(cluster.currMonthRevenue / cluster.currMonthTarget * 100)}%
                                                        </span>
                                                    </TableCell>
                                                    {/* ACH DDR */}
                                                    <TableCell className="px-1 py-0.5 border-r last:border-r-0 text-end text-theme-xs dark:text-white dark:border-gray-800 tabular-nums">
                                                        <span className={cn(getAchGrowthColor(((cluster.currMonthRevenue / currDate) * daysInCurrMonth) / cluster.currMonthTarget * 100) ? 'text-green-500' : 'text-rose-500')}>
                                                            {formatToPercentage(((cluster.currMonthRevenue / currDate) * daysInCurrMonth) / cluster.currMonthTarget * 100)}%
                                                        </span>
                                                    </TableCell>
                                                    {/* MoM */}
                                                    <TableCell className={cn("px-1 py-0.5 border-r last:border-r-0 text-end text-theme-xs font-medium dark:border-gray-800")}>
                                                        <span className={cn(getGrowthColor(((cluster.currMonthRevenue - cluster.prevMonthRevenue) / cluster.prevMonthRevenue * 100)) ? 'text-green-500' : 'text-rose-500')}>
                                                            {formatToPercentage((cluster.currMonthRevenue - cluster.prevMonthRevenue) / cluster.prevMonthRevenue * 100)}%
                                                        </span>
                                                    </TableCell>
                                                    {/* YoY */}
                                                    <TableCell className="px-1 py-0.5 border-r last:border-r-0 text-end text-theme-xs dark:text-white dark:border-gray-800 tabular-nums">
                                                        <span className={cn(getGrowthColor(((cluster.currMonthRevenue - cluster.prevYearCurrMonthRevenue) / cluster.prevYearCurrMonthRevenue * 100)) ? 'text-green-500' : 'text-rose-500')}>
                                                            {formatToPercentage(((cluster.currMonthRevenue - cluster.prevYearCurrMonthRevenue) / cluster.prevYearCurrMonthRevenue * 100))}%
                                                        </span>
                                                    </TableCell>
                                                    {/* YtD */}
                                                    <TableCell className="px-1 py-0.5 border-r last:border-r-0 text-end text-theme-xs dark:text-white dark:border-gray-800 tabular-nums">
                                                        <span className={cn(getGrowthColor(((cluster.currYtdRevenue - cluster.prevYtdRevenue) / cluster.prevYtdRevenue * 100)) ? 'text-green-500' : 'text-rose-500')}>
                                                            {formatToPercentage((cluster.currYtdRevenue - cluster.prevYtdRevenue) / cluster.prevYtdRevenue * 100)}%
                                                        </span>
                                                    </TableCell>
                                                </TableRow>
                                            </React.Fragment>
                                        ))))}

                                <TableRow>
                                    <TableCell colSpan={13} className="px-1 py-0.5 border-r last:border-r-0 text-start font-semibold bg-gray-200 dark:text-white dark:border-gray-800 dark:bg-white/[0.03] text-theme-sm">
                                        Kabupaten
                                    </TableCell>
                                </TableRow>
                                {regional.branches.map((branch: any, branchIndex: number) =>
                                    branch.subbranches.map((subbranch: any, subbranchIndex: number) =>
                                        subbranch.clusters.map((cluster: any, clusterIndex: number) =>
                                            cluster.kabupatens.map((kabupaten: any, kabupatenIndex: number) => (
                                                <React.Fragment key={`branch-${regionalIndex}_${branchIndex}_${subbranchIndex}_${clusterIndex}_${kabupatenIndex}`}>
                                                    <TableRow>
                                                        <TableCell className="px-1 py-0.5 border-r last:border-r-0 text-start font-normal text-theme-xs dark:text-white dark:border-gray-800">
                                                            {kabupaten.name}
                                                        </TableCell>
                                                        <TableCell className="px-1 py-0.5 border-r last:border-r-0 text-end text-theme-xs dark:text-white dark:border-gray-800 tabular-nums">
                                                            <span>{formatToBillion(kabupaten.currMonthTarget)}</span>
                                                        </TableCell>
                                                        <TableCell className="px-1 py-0.5 border-r last:border-r-0 text-end text-theme-xs dark:text-white dark:border-gray-800 tabular-nums">
                                                            <span>{formatToBillion(kabupaten.currMonthRevenue)}</span>
                                                        </TableCell>
                                                        <TableCell className="px-1 py-0.5 border-r last:border-r-0 text-end text-theme-xs dark:text-white dark:border-gray-800 tabular-nums">
                                                            <span>{formatToBillion(kabupaten.prevMonthRevenue)}</span>
                                                        </TableCell>
                                                        <TableCell className="px-1 py-0.5 border-r last:border-r-0 text-end text-theme-xs dark:text-white dark:border-gray-800 tabular-nums">
                                                            <span>{formatToBillion(kabupaten.prevYearCurrMonthRevenue)}</span>
                                                        </TableCell>
                                                        <TableCell className="px-1 py-0.5 border-r last:border-r-0 text-end text-theme-xs dark:text-white dark:border-gray-800 tabular-nums">
                                                            <span>{formatToBillion(kabupaten.currYtdRevenue)}</span>
                                                        </TableCell>
                                                        <TableCell className="px-1 py-0.5 border-r last:border-r-0 text-end text-theme-xs dark:text-white dark:border-gray-800 tabular-nums">
                                                            <span>{formatToBillion(kabupaten.prevYtdRevenue)}</span>
                                                        </TableCell>
                                                        {/* ACH FM */}
                                                        <TableCell className="px-1 py-0.5 border-r last:border-r-0 text-end text-theme-xs dark:text-white dark:border-gray-800 tabular-nums">
                                                            <span className={cn(getAchGrowthColor(kabupaten.currMonthRevenue / kabupaten.currMonthTarget * 100) ? 'text-green-500' : 'text-rose-500')}>
                                                                {formatToPercentage(kabupaten.currMonthRevenue / kabupaten.currMonthTarget * 100)}%
                                                            </span>
                                                        </TableCell>
                                                        {/* ACH DDR */}
                                                        <TableCell className="px-1 py-0.5 border-r last:border-r-0 text-end text-theme-xs dark:text-white dark:border-gray-800 tabular-nums">
                                                            <span className={cn(getAchGrowthColor(((kabupaten.currMonthRevenue / currDate) * daysInCurrMonth) / kabupaten.currMonthTarget * 100) ? 'text-green-500' : 'text-rose-500')}>
                                                                {formatToPercentage(((kabupaten.currMonthRevenue / currDate) * daysInCurrMonth) / kabupaten.currMonthTarget * 100)}%
                                                            </span>
                                                        </TableCell>
                                                        {/* MoM */}
                                                        <TableCell className={cn("px-1 py-0.5 border-r last:border-r-0 text-end text-theme-xs font-medium dark:border-gray-800")}>
                                                            <span className={cn(getGrowthColor(((kabupaten.currMonthRevenue - kabupaten.prevMonthRevenue) / kabupaten.prevMonthRevenue * 100)) ? 'text-green-500' : 'text-rose-500')}>
                                                                {formatToPercentage((kabupaten.currMonthRevenue - kabupaten.prevMonthRevenue) / kabupaten.prevMonthRevenue * 100)}%
                                                            </span>
                                                        </TableCell>
                                                        {/* YoY */}
                                                        <TableCell className="px-1 py-0.5 border-r last:border-r-0 text-end text-theme-xs dark:text-white dark:border-gray-800 tabular-nums">
                                                            <span className={cn(getGrowthColor(((kabupaten.currMonthRevenue - kabupaten.prevYearCurrMonthRevenue) / kabupaten.prevYearCurrMonthRevenue * 100)) ? 'text-green-500' : 'text-rose-500')}>
                                                                {formatToPercentage(((kabupaten.currMonthRevenue - kabupaten.prevYearCurrMonthRevenue) / kabupaten.prevYearCurrMonthRevenue * 100))}%
                                                            </span>
                                                        </TableCell>
                                                        {/* YtD */}
                                                        <TableCell className="px-1 py-0.5 border-r last:border-r-0 text-end text-theme-xs dark:text-white dark:border-gray-800 tabular-nums">
                                                            <span className={cn(getGrowthColor(((kabupaten.currYtdRevenue - kabupaten.prevYtdRevenue) / kabupaten.prevYtdRevenue * 100)) ? 'text-green-500' : 'text-rose-500')}>
                                                                {formatToPercentage((kabupaten.currYtdRevenue - kabupaten.prevYtdRevenue) / kabupaten.prevYtdRevenue * 100)}%
                                                            </span>
                                                        </TableCell>
                                                    </TableRow>
                                                </React.Fragment>
                                            ))
                                        )))}
                            </React.Fragment>
                        ))}
                    </TableBody>
                </Table>
            </ComponentCard>
        </div>
    )
}
