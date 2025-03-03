'use client'

import React from 'react'
import { subMonths, intlFormat, subDays, format, endOfMonth, subYears } from "date-fns";

import { Table, TableBody, TableCell, TableHeader, TableRow } from '@/components/ui/table'
import { useSelectDate } from '@/hooks/use-select-date';
import { Skeleton } from '@/components/common/skeleton';
import ComponentCard from '@/components/common/ComponentCard';

import { cn, formatToBillion, formatToIDR, formatToPercentage, getGrowthColor } from '@/lib/utils';
import { useSelectBranch } from '@/hooks/use-select-branch';
import { useSelectSubbranch } from '@/hooks/use-select-subbranch';
import { useSelectCluster } from '@/hooks/use-select-cluster';
import { useSelectKabupaten } from '@/hooks/use-select-kabupaten';
import { useGetRevenueSA } from '@/modules/revenue-sa/hooks/use-get-revenue-sa';
import { TableNotFound } from '@/components/table-not-found';
import { Tooltip } from '@/components/common/tooltip';

export const TableData = () => {
    const { date: selectedDate } = useSelectDate()
    const { branch: selectedBranch } = useSelectBranch()
    const { subbranch: selectedSubbranch } = useSelectSubbranch()
    const { cluster: selectedCluster } = useSelectCluster()
    const { kabupaten: selectedKabupaten } = useSelectKabupaten()
    const { data: revenues, isLoading: isLoadingRevenue } = useGetRevenueSA({ date: selectedDate })

    const compactDate = subDays(selectedDate, 3) // today - 2 days
    // Last days of months
    const lastDayOfCurrMonth = format(endOfMonth(compactDate), 'yyyy-MM-dd');
    const lastDayOfPrevMonth = format(endOfMonth(subMonths(compactDate, 1)), 'yyyy-MM-dd');
    const lastDayOfPrevYearCurrMonth = format(endOfMonth(subYears(compactDate, 1)), 'yyyy-MM-dd');

    if (isLoadingRevenue) {
        return (
            <div className="max-w-full overflow-x-auto remove-scrollbar">
                <div className="min-w-[1102px]">
                    <div className="flex flex-col space-y-3">
                        <Skeleton className="h-4 w-[200px]" />
                        <Skeleton className="h-[275px] w-[1104px] rounded-xl" />
                    </div>
                </div>
            </div>
        )
    }

    if (!revenues) {
        return (
            <TableNotFound date={selectedDate} daysBehind={3} />
        )
    }

    const filteredRevenues = revenues.map(regional => ({
        ...regional,
        branches: regional.branches.filter((branch: any) => !selectedBranch || branch.name === selectedBranch)
            .map((branch: any) => ({
                ...branch,
                subbranches: branch.subbranches
                    .filter((subbranch: any) => !selectedSubbranch || subbranch.name === selectedSubbranch)
                    .map((subbranch: any) => ({
                        ...subbranch,
                        clusters: subbranch.clusters
                            .filter((cluster: any) => !selectedCluster || cluster.name === selectedCluster)
                            .map((cluster: any) => ({
                                ...cluster,
                                kabupatens: cluster.kabupatens
                                    .filter((kabupaten: any) => !selectedKabupaten || kabupaten.name === selectedKabupaten)
                            }))
                    }))
            }))
    }))

    return (
        <div className="max-w-full overflow-x-auto remove-scrollbar">
            <div className="min-w-[1400px]">
                <ComponentCard title='Porto PUMA'>
                    <Table>
                        <TableHeader className="border-b border-gray-100 dark:border-white/[0.05]">
                            <TableRow>
                                <TableCell
                                    rowSpan={2}
                                    isHeader
                                    className="px-5 py-3 font-medium border-r min-w-[100px] dark:border-gray-700 text-white text-center text-theme-sm bg-rose-500"
                                >
                                    Territory
                                </TableCell>
                                <TableCell
                                    colSpan={10}
                                    isHeader
                                    className="px-5 py-3 font-medium border dark:bg-gray-900 text-gray-500 text-center text-theme-sm dark:text-white dark:border-gray-800"
                                >
                                    Revenue SA
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
                                        lastDayOfPrevMonth,
                                        {
                                            dateStyle: "medium",
                                        },
                                        { locale: "id-ID" }
                                    )}
                                </TableCell>
                                <TableCell isHeader className="px-5 py-3 min-w-[100px] font-medium text-white bg-zinc-950 border-r last:border-r-0 dark:border-r-gray-700 text-center text-theme-xs">
                                    {intlFormat(
                                        lastDayOfPrevYearCurrMonth,
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
                                    Ach FM
                                </TableCell>
                                <TableCell isHeader className="px-5 py-3 min-w-[100px] font-medium text-white bg-zinc-950 border-r last:border-r-0 dark:border-r-gray-700 text-center text-theme-xs">
                                    Ach DDR
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
                                <TableCell colSpan={12} className="px-5 py-4 sm:px-6 border-r last:border-r-0 text-start font-semibold bg-gray-50 text-theme-sm dark:text-white dark:border-gray-800 dark:bg-white/[0.03]">
                                    Regional
                                </TableCell>
                            </TableRow>
                            {filteredRevenues.map((revenue, regionalIndex) => (
                                <React.Fragment key={regionalIndex}>
                                    <TableRow>
                                        <TableCell className="px-5 py-4 sm:px-6 border-r min-w-[50px max-w-[50px] last:border-r-0 text-start font-normal text-theme-xs dark:text-white dark:border-gray-800">
                                            {revenue.name}
                                        </TableCell>
                                        <TableCell className="px-5 py-4 sm:px-6 border-r min-w-[100px]  last:border-r-0 text-end text-theme-xs dark:text-white dark:border-gray-800">
                                            <Tooltip message={formatToIDR(revenue.currMonthTarget)}>
                                                <span className='text-end'>{formatToBillion(revenue.currMonthTarget)}</span>
                                            </Tooltip>
                                        </TableCell>
                                        <TableCell className="px-5 py-4 sm:px-6 border-r min-w-[100px]  last:border-r-0 text-end text-theme-xs dark:text-white dark:border-gray-800">
                                            <Tooltip message={formatToIDR(revenue.currMonthRevenue)}>
                                                <span className='text-end'>{formatToBillion(revenue.currMonthRevenue)}</span>
                                            </Tooltip>
                                        </TableCell>
                                        <TableCell className="px-5 py-4 sm:px-6 border-r min-w-[100px]  last:border-r-0 text-end text-theme-xs dark:text-white dark:border-gray-800">
                                            <Tooltip message={formatToIDR(revenue.prevMonthRevenue)}>
                                                <span className='text-end'>{formatToBillion(revenue.prevMonthRevenue)}</span>
                                            </Tooltip>
                                        </TableCell>
                                        <TableCell className="px-5 py-4 sm:px-6 border-r min-w-[100px]  last:border-r-0 text-end text-theme-xs dark:text-white dark:border-gray-800">
                                            <Tooltip message={formatToIDR(revenue.prevYearCurrMonthRevenue)}>
                                                <span>{formatToBillion(revenue.prevYearCurrMonthRevenue)}</span>
                                            </Tooltip>
                                        </TableCell>
                                        <TableCell className="px-5 py-4 sm:px-6 border-r  min-w-[100px]  last:border-r-0 text-end text-theme-xs dark:text-white dark:border-gray-800">
                                            BLANK
                                        </TableCell>
                                        <TableCell className="px-5 py-4 sm:px-6 border-r  min-w-[100px]  last:border-r-0 text-end text-theme-xs dark:text-white dark:border-gray-800">
                                            BLANK
                                        </TableCell>
                                        <TableCell className="px-5 py-4 sm:px-6 border-r min-w-[100px]  last:border-r-0 text-end text-theme-xs dark:text-white dark:border-gray-800">
                                            <span className={cn(getGrowthColor(revenue.prevMonthRevenue / revenue.currMonthTarget) ? 'text-green-500' : 'text-rose-500')}>
                                                {formatToPercentage(revenue.prevMonthRevenue / revenue.currMonthTarget)}%
                                            </span>
                                        </TableCell>
                                        <TableCell className={cn("px-5 py-4 sm:px-6 border-r min-w-[100px]  last:border-r-0 text-end text-theme-xs font-medium dark:border-gray-800")}>
                                            <span className={cn(getGrowthColor(((revenue.currMonthRevenue - revenue.prevMonthRevenue) / revenue.prevMonthRevenue)) ? 'text-green-500' : 'text-rose-500')}>
                                                {formatToPercentage((revenue.currMonthRevenue - revenue.prevMonthRevenue) / revenue.prevMonthRevenue)}%
                                            </span>
                                        </TableCell>
                                        <TableCell className="px-5 py-4 sm:px-6 border-r min-w-[100px] last:border-r-0 text-end text-theme-xs dark:text-white dark:border-gray-800">
                                            <span className={cn(getGrowthColor(revenue.currMonthRevenue / revenue.prevYearCurrMonthRevenue) ? 'text-green-500' : 'text-rose-500')}>
                                                {formatToPercentage(revenue.currMonthRevenue / revenue.prevYearCurrMonthRevenue)}%
                                            </span>
                                        </TableCell>
                                        <TableCell className="px-5 py-4 sm:px-6 border-r  min-w-[100px] last:border-r-0 text-end text-theme-xs dark:text-white dark:border-gray-800">
                                            BLANK
                                        </TableCell>
                                    </TableRow>

                                    {/* BRANCH */}
                                    <TableRow>
                                        <TableCell colSpan={12} className="px-5 py-4 sm:px-6 border-r last:border-r-0 text-start min-w-[100px]  font-semibold bg-gray-50 dark:text-white dark:border-gray-800 dark:bg-white/[0.03] text-theme-sm">
                                            Branch
                                        </TableCell>
                                    </TableRow>
                                    {revenue.branches.map((branch: any, branchIndex: number) => (
                                        <React.Fragment key={`branch-${regionalIndex}_${branchIndex}`}>
                                            <TableRow>
                                                <TableCell className="px-5 py-4 sm:px-6 border-r min-w-[100px] last:border-r-0 text-start font-normal text-theme-xs dark:text-white dark:border-gray-800">
                                                    {branch.name}
                                                </TableCell>
                                                <TableCell className="px-5 py-4 sm:px-6 border-r min-w-[100px] last:border-r-0 text-end text-theme-xs dark:text-white dark:border-gray-800">
                                                    <Tooltip message={formatToIDR(branch.currMonthTarget)}>
                                                        <span>{formatToBillion(branch.currMonthTarget)}</span>
                                                    </Tooltip>
                                                </TableCell>
                                                <TableCell className="px-5 py-4 sm:px-6 border-r min-w-[100px] last:border-r-0 text-end text-theme-xs dark:text-white dark:border-gray-800">
                                                    <Tooltip message={formatToIDR(branch.currMonthRevenue)}>
                                                        <span>{formatToBillion(branch.currMonthRevenue)}</span>
                                                    </Tooltip>
                                                </TableCell>
                                                <TableCell className="px-5 py-4 sm:px-6 border-r min-w-[100px] last:border-r-0 text-end text-theme-xs dark:text-white dark:border-gray-800">
                                                    <Tooltip message={formatToIDR(branch.prevMonthRevenue)}>
                                                        <span>{formatToBillion(branch.prevMonthRevenue)}</span>
                                                    </Tooltip>
                                                </TableCell>
                                                <TableCell className="px-5 py-4 sm:px-6 border-r min-w-[100px] last:border-r-0 text-end text-theme-xs dark:text-white dark:border-gray-800">
                                                    <Tooltip message={formatToIDR(branch.prevYearCurrMonthRevenue)}>
                                                        <span>{formatToBillion(branch.prevYearCurrMonthRevenue)}</span>
                                                    </Tooltip>
                                                </TableCell>
                                                <TableCell className="px-5 py-4 sm:px-6 border-r min-w-[100px] last:border-r-0 text-end text-theme-xs dark:text-white dark:border-gray-800">
                                                    BLANK
                                                </TableCell>
                                                <TableCell className="px-5 py-4 sm:px-6 border-r min-w-[100px] last:border-r-0 text-end text-theme-xs dark:text-white dark:border-gray-800">
                                                    BLANK
                                                </TableCell>
                                                <TableCell className="px-5 py-4 sm:px-6 border-r min-w-[100px] last:border-r-0 text-end text-theme-xs dark:text-white dark:border-gray-800">
                                                    <span className={cn(getGrowthColor(branch.prevMonthRevenue / branch.currMonthTarget) ? 'text-green-500' : 'text-rose-500')}>
                                                        {formatToPercentage(branch.prevMonthRevenue / branch.currMonthTarget)}%
                                                    </span>
                                                </TableCell>
                                                <TableCell className={cn("px-5 py-4 sm:px-6 border-r min-w-[100px] last:border-r-0 text-end text-theme-xs font-medium dark:border-gray-800")}>
                                                    <span className={cn(getGrowthColor(((branch.currMonthRevenue - branch.prevMonthRevenue) / branch.prevMonthRevenue)) ? 'text-green-500' : 'text-rose-500')}>
                                                        {formatToPercentage((branch.currMonthRevenue - branch.prevMonthRevenue) / branch.prevMonthRevenue)}%
                                                    </span>
                                                </TableCell>
                                                <TableCell className="px-5 py-4 sm:px-6 border-r min-w-[100px] last:border-r-0 text-end text-theme-xs dark:text-white dark:border-gray-800">
                                                    <span className={cn(getGrowthColor(branch.currMonthRevenue / branch.prevYearCurrMonthRevenue) ? 'text-green-500' : 'text-rose-500')}>
                                                        {formatToPercentage(branch.currMonthRevenue / branch.prevYearCurrMonthRevenue)}%
                                                    </span>
                                                </TableCell>
                                                <TableCell className="px-5 py-4 sm:px-6 border-r min-w-[100px] last:border-r-0 text-end text-theme-xs dark:text-white dark:border-gray-800">
                                                    BLANK
                                                </TableCell>
                                            </TableRow>
                                        </React.Fragment>
                                    ))}

                                    {/* SUBBRANCH */}
                                    <TableRow>
                                        <TableCell colSpan={12} className="px-5 py-4 sm:px-6 border-r min-w-[100px] last:border-r-0 text-start font-semibold bg-gray-50 dark:text-white dark:border-gray-800 dark:bg-white/[0.03] text-theme-sm">
                                            Subbranch
                                        </TableCell>
                                    </TableRow>
                                    {revenue.branches.map((branch: any, branchIndex: number) =>
                                        branch.subbranches.map((subbranch: any, subbranchIndex: number) => (
                                            <React.Fragment key={`branch-${regionalIndex}_${branchIndex}_${subbranchIndex}`}>
                                                <TableRow>
                                                    <TableCell className="px-5 py-4 sm:px-6 border-r min-w-[100px] last:border-r-0 text-start font-normal text-theme-xs dark:text-white dark:border-gray-800">
                                                        {subbranch.name}
                                                    </TableCell>
                                                    <TableCell className="px-5 py-4 sm:px-6 border-r min-w-[100px] last:border-r-0 text-end text-theme-xs dark:text-white dark:border-gray-800">
                                                        <Tooltip message={formatToIDR(subbranch.currMonthTarget)}>
                                                            <span>{formatToBillion(subbranch.currMonthTarget)}</span>
                                                        </Tooltip>
                                                    </TableCell>
                                                    <TableCell className="px-5 py-4 sm:px-6 border-r min-w-[100px] last:border-r-0 text-end text-theme-xs dark:text-white dark:border-gray-800">
                                                        <Tooltip message={formatToIDR(subbranch.currMonthRevenue)}>
                                                            <span>{formatToBillion(subbranch.currMonthRevenue)}</span>
                                                        </Tooltip>
                                                    </TableCell>
                                                    <TableCell className="px-5 py-4 sm:px-6 border-r min-w-[100px] last:border-r-0 text-end text-theme-xs dark:text-white dark:border-gray-800">
                                                        <Tooltip message={formatToIDR(subbranch.prevMonthRevenue)}>
                                                            <span>{formatToBillion(subbranch.prevMonthRevenue)}</span>
                                                        </Tooltip>
                                                    </TableCell>
                                                    <TableCell className="px-5 py-4 sm:px-6 border-r min-w-[100px] last:border-r-0 text-end text-theme-xs dark:text-white dark:border-gray-800">
                                                        <Tooltip message={formatToIDR(subbranch.prevYearCurrMonthRevenue)}>
                                                            <span>{formatToBillion(subbranch.prevYearCurrMonthRevenue)}</span>
                                                        </Tooltip>
                                                    </TableCell>
                                                    <TableCell className="px-5 py-4 sm:px-6 border-r min-w-[100px] last:border-r-0 text-end text-theme-xs dark:text-white dark:border-gray-800">
                                                        BLANK
                                                    </TableCell>
                                                    <TableCell className="px-5 py-4 sm:px-6 border-r min-w-[100px] last:border-r-0 text-end text-theme-xs dark:text-white dark:border-gray-800">
                                                        BLANK
                                                    </TableCell>
                                                    <TableCell className="px-5 py-4 sm:px-6 border-r min-w-[100px] last:border-r-0 text-end text-theme-xs dark:text-white dark:border-gray-800">
                                                        <span className={cn(getGrowthColor(subbranch.prevMonthRevenue / subbranch.currMonthTarget) ? 'text-green-500' : 'text-rose-500')}>
                                                            {formatToPercentage(subbranch.prevMonthRevenue / subbranch.currMonthTarget)}%
                                                        </span>
                                                    </TableCell>
                                                    <TableCell className={cn("px-5 py-4 sm:px-6 border-r min-w-[100px] last:border-r-0 text-end text-theme-xs font-medium dark:border-gray-800")}>
                                                        <span className={cn(getGrowthColor(((subbranch.currMonthRevenue - subbranch.prevMonthRevenue) / subbranch.prevMonthRevenue)) ? 'text-green-500' : 'text-rose-500')}>
                                                            {formatToPercentage((subbranch.currMonthRevenue - subbranch.prevMonthRevenue) / subbranch.prevMonthRevenue)}%
                                                        </span>
                                                    </TableCell>
                                                    <TableCell className="px-5 py-4 sm:px-6 border-r min-w-[100px] last:border-r-0 text-end text-theme-xs dark:text-white dark:border-gray-800">
                                                        <span className={cn(getGrowthColor(subbranch.currMonthRevenue / subbranch.prevYearCurrMonthRevenue) ? 'text-green-500' : 'text-rose-500')}>
                                                            {formatToPercentage(subbranch.currMonthRevenue / subbranch.prevYearCurrMonthRevenue)}%
                                                        </span>
                                                    </TableCell>
                                                    <TableCell className="px-5 py-4 sm:px-6 border-r min-w-[100px] last:border-r-0 text-end text-theme-xs dark:text-white dark:border-gray-800">
                                                        BLANK
                                                    </TableCell>
                                                </TableRow>
                                            </React.Fragment>
                                        )))}

                                    <TableRow>
                                        <TableCell colSpan={12} className="px-5 py-4 sm:px-6 border-r min-w-[100px] last:border-r-0 text-start font-semibold bg-gray-50 dark:text-white dark:border-gray-800 dark:bg-white/[0.03] text-theme-sm">
                                            Clusters
                                        </TableCell>
                                    </TableRow>
                                    {revenue.branches.map((branch: any, branchIndex: number) =>
                                        branch.subbranches.map((subbranch: any, subbranchIndex: number) =>
                                            subbranch.clusters.map((cluster: any, clusterIndex: number) => (
                                                <React.Fragment key={`branch-${regionalIndex}_${branchIndex}_${subbranchIndex}_${clusterIndex}`}>
                                                    <TableRow>
                                                        <TableCell className="px-5 py-4 sm:px-6 border-r min-w-[100px] last:border-r-0 text-start font-normal text-theme-xs dark:text-white dark:border-gray-800">
                                                            {cluster.name}
                                                        </TableCell>
                                                        <TableCell className="px-5 py-4 sm:px-6 border-r min-w-[100px] last:border-r-0 text-end text-theme-xs dark:text-white dark:border-gray-800">
                                                            <Tooltip message={formatToIDR(cluster.currMonthTarget)}>
                                                                <span>{formatToBillion(cluster.currMonthTarget)}</span>
                                                            </Tooltip>
                                                        </TableCell>
                                                        <TableCell className="px-5 py-4 sm:px-6 border-r min-w-[100px] last:border-r-0 text-end text-theme-xs dark:text-white dark:border-gray-800">
                                                            <Tooltip message={formatToIDR(cluster.currMonthRevenue)}>
                                                                <span>{formatToBillion(cluster.currMonthRevenue)}</span>
                                                            </Tooltip>
                                                        </TableCell>
                                                        <TableCell className="px-5 py-4 sm:px-6 border-r min-w-[100px] last:border-r-0 text-end text-theme-xs dark:text-white dark:border-gray-800">
                                                            <Tooltip message={formatToIDR(cluster.prevMonthRevenue)}>
                                                                <span>{formatToBillion(cluster.prevMonthRevenue)}</span>
                                                            </Tooltip>
                                                        </TableCell>
                                                        <TableCell className="px-5 py-4 sm:px-6 border-r min-w-[100px] last:border-r-0 text-end text-theme-xs dark:text-white dark:border-gray-800">
                                                            <Tooltip message={formatToIDR(cluster.prevYearCurrMonthRevenue)}>
                                                                <span>{formatToBillion(cluster.prevYearCurrMonthRevenue)}</span>
                                                            </Tooltip>
                                                        </TableCell>
                                                        <TableCell className="px-5 py-4 sm:px-6 border-r last:border-r-0 text-end text-theme-xs dark:text-white dark:border-gray-800 min-w-[100px]">
                                                            BLANK
                                                        </TableCell>
                                                        <TableCell className="px-5 py-4 sm:px-6 border-r last:border-r-0 text-end text-theme-xs dark:text-white dark:border-gray-800 min-w-[100px]">
                                                            BLANK
                                                        </TableCell>
                                                        <TableCell className="px-5 py-4 sm:px-6 border-r last:border-r-0 text-end text-theme-xs dark:text-white dark:border-gray-800 min-w-[100px]">
                                                            <span className={cn(getGrowthColor(cluster.prevMonthRevenue / cluster.currMonthTarget) ? 'text-green-500' : 'text-rose-500')}>
                                                                {formatToPercentage(cluster.prevMonthRevenue / cluster.currMonthTarget)}%
                                                            </span>
                                                        </TableCell>
                                                        <TableCell className={cn("px-5 py-4 sm:px-6 border-r last:border-r-0 text-end text-theme-xs font-medium dark:border-gray-800")}>
                                                            <span className={cn(getGrowthColor(((cluster.currMonthRevenue - cluster.prevMonthRevenue) / cluster.prevMonthRevenue)) ? 'text-green-500' : 'text-rose-500')}>
                                                                {formatToPercentage((cluster.currMonthRevenue - cluster.prevMonthRevenue) / cluster.prevMonthRevenue)}%
                                                            </span>
                                                        </TableCell>
                                                        <TableCell className="px-5 py-4 sm:px-6 border-r last:border-r-0 text-end text-theme-xs dark:text-white dark:border-gray-800 min-w-[100px]">
                                                            <span className={cn(getGrowthColor(cluster.currMonthRevenue / cluster.prevYearCurrMonthRevenue) ? 'text-green-500' : 'text-rose-500')}>
                                                                {formatToPercentage(cluster.currMonthRevenue / cluster.prevYearCurrMonthRevenue)}%
                                                            </span>
                                                        </TableCell>
                                                        <TableCell className="px-5 py-4 sm:px-6 border-r last:border-r-0 text-end text-theme-xs dark:text-white dark:border-gray-800 min-w-[100px]">
                                                            BLANK
                                                        </TableCell>
                                                    </TableRow>
                                                </React.Fragment>
                                            ))))}

                                    <TableRow>
                                        <TableCell colSpan={12} className="px-5 py-4 sm:px-6 border-r last:border-r-0 text-start font-semibold bg-gray-50 dark:text-white dark:border-gray-800 dark:bg-white/[0.03] text-theme-sm">
                                            Kabupaten
                                        </TableCell>
                                    </TableRow>
                                    {revenue.branches.map((branch: any, branchIndex: number) =>
                                        branch.subbranches.map((subbranch: any, subbranchIndex: number) =>
                                            subbranch.clusters.map((cluster: any, clusterIndex: number) =>
                                                cluster.kabupatens.map((kabupaten: any, kabupatenIndex: number) => (
                                                    <React.Fragment key={`branch-${regionalIndex}_${branchIndex}_${subbranchIndex}_${clusterIndex}_${kabupatenIndex}`}>
                                                        <TableRow>
                                                            <TableCell className="px-5 py-4 sm:px-6 border-r last:border-r-0 text-start font-normal text-theme-xs dark:text-white dark:border-gray-800">
                                                                {kabupaten.name}
                                                            </TableCell>
                                                            <TableCell className="px-5 py-4 sm:px-6 border-r last:border-r-0 text-end text-theme-xs dark:text-white dark:border-gray-800 min-w-[100px]">
                                                                <Tooltip message={formatToIDR(kabupaten.currMonthTarget)}>
                                                                    <span>{formatToBillion(kabupaten.currMonthTarget)}</span>
                                                                </Tooltip>
                                                            </TableCell>
                                                            <TableCell className="px-5 py-4 sm:px-6 border-r last:border-r-0 text-end text-theme-xs dark:text-white dark:border-gray-800 min-w-[100px]">
                                                                <Tooltip message={formatToIDR(kabupaten.currMonthRevenue)}>
                                                                    <span>{formatToBillion(kabupaten.currMonthRevenue)}</span>
                                                                </Tooltip>
                                                            </TableCell>
                                                            <TableCell className="px-5 py-4 sm:px-6 border-r last:border-r-0 text-end text-theme-xs dark:text-white dark:border-gray-800 min-w-[100px]">
                                                                <Tooltip message={formatToIDR(kabupaten.prevMonthRevenue)}>
                                                                    <span>{formatToBillion(kabupaten.prevMonthRevenue)}</span>
                                                                </Tooltip>
                                                            </TableCell>
                                                            <TableCell className="px-5 py-4 sm:px-6 border-r last:border-r-0 text-end text-theme-xs dark:text-white dark:border-gray-800 min-w-[100px]">
                                                                <Tooltip message={formatToIDR(kabupaten.prevYearCurrMonthRevenue)}>
                                                                    <span>{formatToBillion(kabupaten.prevYearCurrMonthRevenue)}</span>
                                                                </Tooltip>
                                                            </TableCell>
                                                            <TableCell className="px-5 py-4 sm:px-6 border-r last:border-r-0 text-end text-theme-xs dark:text-white dark:border-gray-800 min-w-[100px]">
                                                                BLANK
                                                            </TableCell>
                                                            <TableCell className="px-5 py-4 sm:px-6 border-r last:border-r-0 text-end text-theme-xs dark:text-white dark:border-gray-800 min-w-[100px]">
                                                                BLANK
                                                            </TableCell>
                                                            <TableCell className="px-5 py-4 sm:px-6 border-r last:border-r-0 text-end text-theme-xs dark:text-white dark:border-gray-800 min-w-[100px]">
                                                                <span className={cn(getGrowthColor(kabupaten.prevMonthRevenue / kabupaten.currMonthTarget) ? 'text-green-500' : 'text-rose-500')}>
                                                                    {formatToPercentage(kabupaten.prevMonthRevenue / kabupaten.currMonthTarget)}%
                                                                </span>
                                                            </TableCell>
                                                            <TableCell className={cn("px-5 py-4 sm:px-6 border-r last:border-r-0 text-end text-theme-xs font-medium dark:border-gray-800")}>
                                                                <span className={cn(getGrowthColor((kabupaten.currMonthRevenue - kabupaten.prevMonthRevenue) / kabupaten.prevMonthRevenue) ? 'text-green-500' : 'text-rose-500')}>
                                                                    {formatToPercentage(((kabupaten.currMonthRevenue - kabupaten.prevMonthRevenue) / kabupaten.prevMonthRevenue))}%
                                                                </span>
                                                            </TableCell>
                                                            <TableCell className="px-5 py-4 sm:px-6 border-r last:border-r-0 text-end text-theme-xs dark:text-white dark:border-gray-800 min-w-[100px]">
                                                                <span className={cn(getGrowthColor(kabupaten.currMonthRevenue / kabupaten.prevYearCurrMonthRevenue) ? 'text-green-500' : 'text-rose-500')}>
                                                                    {formatToPercentage(kabupaten.currMonthRevenue / kabupaten.prevYearCurrMonthRevenue)}%
                                                                </span>
                                                            </TableCell>
                                                            <TableCell className="px-5 py-4 sm:px-6 border-r last:border-r-0 text-end text-theme-xs dark:text-white dark:border-gray-800 min-w-[100px]">
                                                                BLANK
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
        </div>
    )
}
