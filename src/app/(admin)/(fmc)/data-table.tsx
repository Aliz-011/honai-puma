'use client'

import { InferResponseType } from "hono"
import { Fragment } from "react"

import ComponentCard from "@/components/common/ComponentCard"
import { Skeleton } from "@/components/common/skeleton"
import { Table, TableBody, TableCell, TableHeader, TableRow } from "@/components/ui/table"
import { TableNotFound } from "./table-not-found"
import { cn, formatToBillion, getGrowthColor } from "@/lib/utils"
import { client } from "@/lib/client"
import { endOfMonth, format, getDaysInMonth, subDays, subMonths } from "date-fns"

function formatToPercentage(number: number) {
    return (number).toLocaleString('id-ID', {
        maximumFractionDigits: 2,
        minimumFractionDigits: 2,
        style: 'percent'
    })
}

type ResponseData = InferResponseType<typeof client.api['linein-service']['$get']>['data']

export const DataTable = ({ isLoading, data, title, date }: {
    isLoading?: boolean;
    data?: ResponseData;
    title: string;
    date?: Date
}) => {

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

    if (!data) {
        return <TableNotFound />
    }

    const selectedDate = date ? date : subDays(new Date(), 2)
    const closingDate = endOfMonth(selectedDate)
    const isEndOfMonth = selectedDate.getDate() === closingDate.getDate();
    const endOfCurrMonth = isEndOfMonth ? closingDate : selectedDate
    const isCurrMonth = format(selectedDate, 'MM') === format(new Date(), 'MM')
    const multidimDay = isCurrMonth ? format(selectedDate, 'yyyy-MM-dd') : format(closingDate, 'yyyy-MM-dd')

    return (
        <div className="w-fit overflow-x-auto remove-scrollbar">
            <ComponentCard title={title} desc={<span className="text-xs font-medium">MTD: {multidimDay}</span>}>
                <Table className="w-full">
                    <TableHeader className="border-b border-gray-100 dark:border-white/[0.05]">
                        <TableRow>
                            <TableCell rowSpan={3} isHeader className="px-2.5 min-w-[80px] font-medium border-r dark:border-gray-700 text-white text-center text-theme-sm bg-rose-600">
                                &nbsp;
                            </TableCell>
                            <TableCell rowSpan={3} isHeader className="px-2.5 font-medium border-r dark:border-gray-700 text-white text-center text-theme-sm bg-rose-600">
                                Territory
                            </TableCell>
                        </TableRow>
                        <TableRow>
                            <TableCell isHeader colSpan={4} className="px-2.5 py-1 border whitespace-nowrap font-medium text-white bg-zinc-950 border-r last:border-r-0 dark:border-gray-700 text-center text-theme-xs">
                                REVENUE
                            </TableCell>
                            <TableCell isHeader colSpan={3} className="px-2.5 py-1 border whitespace-nowrap font-medium text-white bg-zinc-950 border-r last:border-r-0 dark:border-gray-700 text-center text-theme-xs">
                                MOM DAILY REVENUE
                            </TableCell>
                        </TableRow>
                        <TableRow>
                            <TableCell isHeader className="px-2.5 py-1 whitespace-nowrap font-medium text-white bg-zinc-700 border-r last:border-r-0 dark:border-r-gray-700 text-center text-theme-xs">
                                FM M-3
                            </TableCell>
                            <TableCell isHeader className="px-2.5 py-1 whitespace-nowrap font-medium text-white bg-zinc-700 border-r last:border-r-0 dark:border-r-gray-700 text-center text-theme-xs">
                                FM M-2
                            </TableCell>
                            <TableCell isHeader className="px-2.5 py-1 whitespace-nowrap font-medium text-white bg-zinc-700 border-r last:border-r-0 dark:border-r-gray-700 text-center text-theme-xs">
                                FM M-1
                            </TableCell>
                            <TableCell isHeader className="px-2.5 py-1 whitespace-nowrap font-medium text-white bg-zinc-700 border-r last:border-r-0 dark:border-r-gray-700 text-center text-theme-xs">
                                MTD
                            </TableCell>
                            <TableCell isHeader className="px-2.5 py-1 whitespace-nowrap font-medium text-white bg-zinc-700 border-r last:border-r-0 dark:border-r-gray-700 text-center text-theme-xs">
                                MOM <br />
                                <span className="text-[10px]">(MTD vs M-1)</span>
                            </TableCell>
                            <TableCell isHeader className="px-2.5 py-1 whitespace-nowrap font-medium text-white bg-zinc-700 border-r last:border-r-0 dark:border-r-gray-700 text-center text-theme-xs">
                                MOM-1 <br />
                                <span className="text-[10px]">(M-1 vs M-2)</span>
                            </TableCell>
                            <TableCell isHeader className="px-2.5 py-1 whitespace-nowrap font-medium text-white bg-zinc-700 border-r last:border-r-0 dark:border-r-gray-700 text-center text-theme-xs">
                                MOM-2 <br />
                                <span className="text-[10px]">(M-2 vs M-3)</span>
                            </TableCell>
                        </TableRow>
                    </TableHeader>
                    <TableBody className="divide-y divide-gray-100 dark:divide-white/[0.05]">
                        <TableRow>
                            <TableCell colSpan={13} className="px-1 py-0.5 border-r last:border-r-0 text-start font-semibold bg-gray-200 text-theme-sm dark:text-white dark:border-gray-800 dark:bg-white/[0.03]">
                                REGION
                            </TableCell>
                        </TableRow>
                        {data.map((item, index) => (
                            <Fragment key={index}>
                                <TableRow>
                                    <TableCell className="px-2.5 py-0.5 border-r last:border-r-0 text-start font-normal text-theme-xs dark:text-white dark:border-gray-800 ">
                                        &nbsp;
                                    </TableCell>
                                    <TableCell className="px-2.5 py-0.5 border-r last:border-r-0 text-start font-normal text-theme-xs dark:text-white dark:border-gray-800 ">
                                        {item.name}
                                    </TableCell>
                                    {/* M-3 */}
                                    <TableCell className="px-2.5 py-0.5 border-r last:border-r-0 text-start font-normal text-theme-xs dark:text-white dark:border-gray-800 ">
                                        <span className="tabular-nums">
                                            {formatToBillion(Number(item.revM3))}
                                        </span>
                                    </TableCell>
                                    {/* M-2 */}
                                    <TableCell className="px-2.5 py-0.5 border-r last:border-r-0 text-start font-normal text-theme-xs dark:text-white dark:border-gray-800 ">
                                        <span className="tabular-nums">
                                            {formatToBillion(Number(item.revM2))}
                                        </span>
                                    </TableCell>
                                    {/* M-1 */}
                                    <TableCell className="px-2.5 py-0.5 border-r last:border-r-0 text-start font-normal text-theme-xs dark:text-white dark:border-gray-800 ">
                                        <span className="tabular-nums">
                                            {formatToBillion(Number(item.revM1))}
                                        </span>
                                    </TableCell>
                                    {/* MTD */}
                                    <TableCell className="px-2.5 py-0.5 border-r last:border-r-0 text-start font-normal text-theme-xs dark:text-white dark:border-gray-800 ">
                                        <span className="tabular-nums">
                                            {formatToBillion(Number(item.revMtd))}
                                        </span>
                                    </TableCell>
                                    {/* MOM */}
                                    <TableCell className="px-2.5 py-0.5 border-r last:border-r-0 text-start font-normal text-theme-xs dark:text-white dark:border-gray-800 ">
                                        <span className={cn(getGrowthColor((Number(item.drMtd) / Number(item.drM1) - 1)) ? 'text-green-500' : 'text-rose-500')}>
                                            {formatToPercentage((Number(item.drMtd) / Number(item.drM1) - 1))}
                                        </span>
                                    </TableCell>
                                    {/* MOM1 */}
                                    <TableCell className="px-2.5 py-0.5 border-r last:border-r-0 text-start font-normal text-theme-xs dark:text-white dark:border-gray-800 ">
                                        <span className={cn(getGrowthColor((Number(item.drM1) / Number(item.drM2) - 1)) ? 'text-green-500' : 'text-rose-500')}>
                                            {formatToPercentage((Number(item.drM1) / Number(item.drM2) - 1))}
                                        </span>
                                    </TableCell>
                                    {/* MOM2 */}
                                    <TableCell className="px-2.5 py-0.5 border-r last:border-r-0 text-start font-normal text-theme-xs dark:text-white dark:border-gray-800">
                                        <span className={cn(getGrowthColor((Number(item.drM2) / Number(item.drM3) - 1)) ? 'text-green-500' : 'text-rose-500')}>
                                            {formatToPercentage((Number(item.drM2) / Number(item.drM3) - 1))}
                                        </span>
                                    </TableCell>
                                </TableRow>

                                {/* BRANCH */}
                                <TableRow>
                                    <TableCell colSpan={13} className="px-1 py-0.5 border-r last:border-r-0 text-start font-semibold bg-gray-200 dark:text-white dark:border-gray-800 dark:bg-white/[0.03] text-theme-sm">
                                        BRANCH
                                    </TableCell>
                                </TableRow>
                                {item.branches.map((branch, branchIndex) => (
                                    <Fragment key={`branch-${branchIndex}-${index}`}>
                                        <TableRow>
                                            <TableCell className="px-2.5 py-0.5 border-r last:border-r-0 text-start font-normal text-theme-xs dark:text-white dark:border-gray-800 ">
                                                {item.name}
                                            </TableCell>
                                            <TableCell className="px-2.5 py-0.5 border-r last:border-r-0 text-start font-normal text-theme-xs dark:text-white dark:border-gray-800 ">
                                                {branch.name}
                                            </TableCell>
                                            {/* M-3 */}
                                            <TableCell className="px-2.5 py-0.5 border-r last:border-r-0 text-start font-normal text-theme-xs dark:text-white dark:border-gray-800 ">
                                                <span className="tabular-nums">
                                                    {formatToBillion(Number(branch.revM3))}
                                                </span>
                                            </TableCell>
                                            {/* M-2 */}
                                            <TableCell className="px-2.5 py-0.5 border-r last:border-r-0 text-start font-normal text-theme-xs dark:text-white dark:border-gray-800 ">
                                                <span className="tabular-nums">
                                                    {formatToBillion(Number(branch.revM2))}
                                                </span>
                                            </TableCell>
                                            {/* M-1 */}
                                            <TableCell className="px-2.5 py-0.5 border-r last:border-r-0 text-start font-normal text-theme-xs dark:text-white dark:border-gray-800 ">
                                                <span className="tabular-nums">
                                                    {formatToBillion(Number(branch.revM1))}
                                                </span>
                                            </TableCell>
                                            {/* MTD */}
                                            <TableCell className="px-2.5 py-0.5 border-r last:border-r-0 text-start font-normal text-theme-xs dark:text-white dark:border-gray-800 ">
                                                <span className="tabular-nums">
                                                    {formatToBillion(Number(branch.revMtd))}
                                                </span>
                                            </TableCell>
                                            {/* MOM */}
                                            <TableCell className="px-2.5 py-0.5 border-r last:border-r-0 text-start font-normal text-theme-xs dark:text-white dark:border-gray-800 ">
                                                <span className={cn(getGrowthColor((Number(branch.drMtd) / Number(branch.drM1) - 1)) ? 'text-green-500' : 'text-rose-500')}>
                                                    {formatToPercentage((Number(branch.drMtd) / Number(branch.drM1) - 1))}
                                                </span>
                                            </TableCell>
                                            {/* MOM1 */}
                                            <TableCell className="px-2.5 py-0.5 border-r last:border-r-0 text-start font-normal text-theme-xs dark:text-white dark:border-gray-800 ">
                                                <span className={cn(getGrowthColor((Number(branch.drM1) / Number(branch.drM2) - 1)) ? 'text-green-500' : 'text-rose-500')}>
                                                    {formatToPercentage((Number(branch.drM1) / Number(branch.drM2) - 1))}
                                                </span>
                                            </TableCell>
                                            {/* MOM2 */}
                                            <TableCell className="px-2.5 py-0.5 border-r last:border-r-0 text-start font-normal text-theme-xs dark:text-white dark:border-gray-800">
                                                <span className={cn(getGrowthColor((Number(branch.drM2) / Number(branch.drM3) - 1)) ? 'text-green-500' : 'text-rose-500')}>
                                                    {formatToPercentage((Number(branch.drM2) / Number(branch.drM3) - 1))}
                                                </span>
                                            </TableCell>
                                        </TableRow>
                                    </Fragment>
                                ))}

                                {/* WOK */}
                                <TableRow>
                                    <TableCell colSpan={13} className="px-1 py-0.5 border-r last:border-r-0 text-start font-semibold bg-gray-200 dark:text-white dark:border-gray-800 dark:bg-white/[0.03] text-theme-sm">
                                        WOK
                                    </TableCell>
                                </TableRow>
                                {item.branches.map((branch, branchIndex) =>
                                    branch.woks.map((wok, wokIndex) => (
                                        <Fragment key={`wok-${wokIndex}-${branchIndex}-${index}`}>
                                            <TableRow>
                                                <TableCell className="px-2.5 py-0.5 border-r last:border-r-0 text-start font-normal text-theme-xs dark:text-white dark:border-gray-800 ">
                                                    {branch.name}
                                                </TableCell>
                                                <TableCell className="px-2.5 py-0.5 border-r last:border-r-0 text-start font-normal text-theme-xs dark:text-white dark:border-gray-800 ">
                                                    {wok.name}
                                                </TableCell>
                                                {/* M-3 */}
                                                <TableCell className="px-2.5 py-0.5 border-r last:border-r-0 text-start font-normal text-theme-xs dark:text-white dark:border-gray-800 ">
                                                    <span className="tabular-nums">
                                                        {formatToBillion(Number(wok.revM3))}
                                                    </span>
                                                </TableCell>
                                                {/* M-2 */}
                                                <TableCell className="px-2.5 py-0.5 border-r last:border-r-0 text-start font-normal text-theme-xs dark:text-white dark:border-gray-800 ">
                                                    <span className="tabular-nums">
                                                        {formatToBillion(Number(wok.revM2))}
                                                    </span>
                                                </TableCell>
                                                {/* M-1 */}
                                                <TableCell className="px-2.5 py-0.5 border-r last:border-r-0 text-start font-normal text-theme-xs dark:text-white dark:border-gray-800 ">
                                                    <span className="tabular-nums">
                                                        {formatToBillion(Number(wok.revM1))}
                                                    </span>
                                                </TableCell>
                                                {/* MTD */}
                                                <TableCell className="px-2.5 py-0.5 border-r last:border-r-0 text-start font-normal text-theme-xs dark:text-white dark:border-gray-800 ">
                                                    <span className="tabular-nums">
                                                        {formatToBillion(Number(wok.revMtd))}
                                                    </span>
                                                </TableCell>
                                                {/* MOM */}
                                                <TableCell className="px-2.5 py-0.5 border-r last:border-r-0 text-start font-normal text-theme-xs dark:text-white dark:border-gray-800 ">
                                                    <span className={cn(getGrowthColor((Number(wok.drMtd) / Number(wok.drM1)) - 1) ? 'text-green-500' : 'text-rose-500')}>
                                                        {formatToPercentage((Number(wok.drMtd) / Number(wok.drM1) - 1))}
                                                    </span>
                                                </TableCell>
                                                {/* MOM1 */}
                                                <TableCell className="px-2.5 py-0.5 border-r last:border-r-0 text-start font-normal text-theme-xs dark:text-white dark:border-gray-800 ">
                                                    <span className={cn(getGrowthColor((Number(wok.drM1) / Number(wok.drM2)) - 1) ? 'text-green-500' : 'text-rose-500')}>
                                                        {formatToPercentage((Number(wok.drM1) / Number(wok.drM2) - 1))}
                                                    </span>
                                                </TableCell>
                                                {/* MOM2 */}
                                                <TableCell className="px-2.5 py-0.5 border-r last:border-r-0 text-start font-normal text-theme-xs dark:text-white dark:border-gray-800">
                                                    <span className={cn(getGrowthColor((Number(wok.drM2) / Number(wok.drM3)) - 1) ? 'text-green-500' : 'text-rose-500')}>
                                                        {formatToPercentage((Number(wok.drM2) / Number(wok.drM3) - 1))}
                                                    </span>
                                                </TableCell>
                                            </TableRow>
                                        </Fragment>
                                    ))
                                )}

                                {/* STO */}
                                <TableRow>
                                    <TableCell colSpan={13} className="px-1 py-0.5 border-r last:border-r-0 text-start font-semibold bg-gray-200 dark:text-white dark:border-gray-800 dark:bg-white/[0.03] text-theme-sm">
                                        STO
                                    </TableCell>
                                </TableRow>
                                {item.branches.map((branch, branchIndex) =>
                                    branch.woks.map((wok, wokIndex) =>
                                        wok.stos.map((sto, stoIndex) => (
                                            <Fragment key={`sto-${stoIndex}-${wokIndex}-${branchIndex}-${index}`}>
                                                <TableRow>
                                                    <TableCell className="px-2.5 py-0.5 border-r last:border-r-0 text-start font-normal text-theme-xs dark:text-white dark:border-gray-800 ">
                                                        {wok.name}
                                                    </TableCell>
                                                    <TableCell className="px-2.5 py-0.5 border-r last:border-r-0 text-start font-normal text-theme-xs dark:text-white dark:border-gray-800 ">
                                                        {sto.name}
                                                    </TableCell>
                                                    {/* M-3 */}
                                                    <TableCell className="px-2.5 py-0.5 border-r last:border-r-0 text-start font-normal text-theme-xs dark:text-white dark:border-gray-800 ">
                                                        <span className="tabular-nums">
                                                            {formatToBillion(Number(sto.revM3))}
                                                        </span>
                                                    </TableCell>
                                                    {/* M-2 */}
                                                    <TableCell className="px-2.5 py-0.5 border-r last:border-r-0 text-start font-normal text-theme-xs dark:text-white dark:border-gray-800 ">
                                                        <span className="tabular-nums">
                                                            {formatToBillion(Number(sto.revM2))}
                                                        </span>
                                                    </TableCell>
                                                    {/* M-1 */}
                                                    <TableCell className="px-2.5 py-0.5 border-r last:border-r-0 text-start font-normal text-theme-xs dark:text-white dark:border-gray-800 ">
                                                        <span className="tabular-nums">
                                                            {formatToBillion(Number(sto.revM1))}
                                                        </span>
                                                    </TableCell>
                                                    {/* MTD */}
                                                    <TableCell className="px-2.5 py-0.5 border-r last:border-r-0 text-start font-normal text-theme-xs dark:text-white dark:border-gray-800 ">
                                                        <span className="tabular-nums">
                                                            {formatToBillion(Number(sto.revMtd))}
                                                        </span>
                                                    </TableCell>
                                                    {/* MOM */}
                                                    <TableCell className="px-2.5 py-0.5 border-r last:border-r-0 text-start font-normal text-theme-xs dark:text-white dark:border-gray-800 ">
                                                        <span className={cn(getGrowthColor((Number(sto.drMtd) / Number(sto.drM1)) - 1) ? 'text-green-500' : 'text-rose-500')}>
                                                            {formatToPercentage((Number(sto.drMtd) / Number(sto.drM1) - 1))}
                                                        </span>
                                                    </TableCell>
                                                    {/* MOM1 */}
                                                    <TableCell className="px-2.5 py-0.5 border-r last:border-r-0 text-start font-normal text-theme-xs dark:text-white dark:border-gray-800 ">
                                                        <span className={cn(getGrowthColor((Number(sto.drM1) / Number(sto.drM2)) - 1) ? 'text-green-500' : 'text-rose-500')}>
                                                            {formatToPercentage((Number(sto.drM1) / Number(sto.drM2) - 1))}
                                                        </span>
                                                    </TableCell>
                                                    {/* MOM2 */}
                                                    <TableCell className="px-2.5 py-0.5 border-r last:border-r-0 text-start font-normal text-theme-xs dark:text-white dark:border-gray-800">
                                                        <span className={cn(getGrowthColor((Number(sto.drM2) / Number(sto.drM3)) - 1) ? 'text-green-500' : 'text-rose-500')}>
                                                            {formatToPercentage((Number(sto.drM2) / Number(sto.drM3) - 1))}
                                                        </span>
                                                    </TableCell>
                                                </TableRow>
                                            </Fragment>
                                        )))
                                )}
                            </Fragment>
                        ))}
                    </TableBody>
                </Table>
            </ComponentCard>
        </div>
    )
}

export const DataTableARPU = ({ isLoading, data, title, date }: {
    isLoading?: boolean,
    data?: ResponseData,
    title: string,
    date?: Date
}) => {

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

    if (!data) {
        return <TableNotFound />
    }

    const selectedDate = date ? date : subDays(new Date(), 2)
    const closingDate = endOfMonth(selectedDate)
    const isEndOfMonth = selectedDate.getDate() === closingDate.getDate();
    const endOfCurrMonth = isEndOfMonth ? closingDate : selectedDate
    const isCurrMonth = format(selectedDate, 'MM') === format(new Date(), 'MM')
    const multidimDay = isCurrMonth ? format(selectedDate, 'yyyy-MM-dd') : format(closingDate, 'yyyy-MM-dd')

    const today = parseInt(format(selectedDate, 'd'));
    const daysInCurrMonth = getDaysInMonth(selectedDate)
    const daysInPrevMonth = getDaysInMonth(subMonths(selectedDate, 1))
    const daysInPrevMonth2 = getDaysInMonth(subMonths(selectedDate, 2))
    const daysInPrevMonth3 = getDaysInMonth(subMonths(selectedDate, 3))

    return (
        <div className="w-fit overflow-x-auto remove-scrollbar">
            <ComponentCard title={title} desc={<span className="text-xs font-medium">MTD: {multidimDay}</span>}>
                <Table className="w-full">
                    <TableHeader className="border-b border-gray-100 dark:border-white/[0.05]">
                        <TableRow>
                            <TableCell rowSpan={3} isHeader className="px-2.5 min-w-[80px] font-medium border-r dark:border-gray-700 text-white text-center text-theme-sm bg-rose-600">
                                &nbsp;
                            </TableCell>
                            <TableCell rowSpan={3} isHeader className="px-2.5 font-medium border-r dark:border-gray-700 text-white text-center text-theme-sm bg-rose-600">
                                Territory
                            </TableCell>
                        </TableRow>
                        <TableRow>
                            <TableCell isHeader colSpan={4} className="px-2.5 py-1 border whitespace-nowrap font-medium text-white bg-zinc-950 border-r last:border-r-0 dark:border-gray-700 text-center text-theme-xs">
                                {title}
                            </TableCell>
                            <TableCell isHeader colSpan={3} className="px-2.5 py-1 border whitespace-nowrap font-medium text-white bg-zinc-950 border-r last:border-r-0 dark:border-gray-700 text-center text-theme-xs">
                                MOM DAILY {title}
                            </TableCell>
                        </TableRow>
                        <TableRow>
                            <TableCell isHeader className="px-2.5 py-1 whitespace-nowrap font-medium text-white bg-zinc-700 border-r last:border-r-0 dark:border-r-gray-700 text-center text-theme-xs">
                                FM M-3
                            </TableCell>
                            <TableCell isHeader className="px-2.5 py-1 whitespace-nowrap font-medium text-white bg-zinc-700 border-r last:border-r-0 dark:border-r-gray-700 text-center text-theme-xs">
                                FM M-2
                            </TableCell>
                            <TableCell isHeader className="px-2.5 py-1 whitespace-nowrap font-medium text-white bg-zinc-700 border-r last:border-r-0 dark:border-r-gray-700 text-center text-theme-xs">
                                FM M-1
                            </TableCell>
                            <TableCell isHeader className="px-2.5 py-1 whitespace-nowrap font-medium text-white bg-zinc-700 border-r last:border-r-0 dark:border-r-gray-700 text-center text-theme-xs">
                                MTD
                            </TableCell>
                            <TableCell isHeader className="px-2.5 py-1 whitespace-nowrap font-medium text-white bg-zinc-700 border-r last:border-r-0 dark:border-r-gray-700 text-center text-theme-xs">
                                MOM <br />
                                <span className="text-[10px]">(MTD vs M-1)</span>
                            </TableCell>
                            <TableCell isHeader className="px-2.5 py-1 whitespace-nowrap font-medium text-white bg-zinc-700 border-r last:border-r-0 dark:border-r-gray-700 text-center text-theme-xs">
                                MOM-1 <br />
                                <span className="text-[10px]">(M-1 vs M-2)</span>
                            </TableCell>
                            <TableCell isHeader className="px-2.5 py-1 whitespace-nowrap font-medium text-white bg-zinc-700 border-r last:border-r-0 dark:border-r-gray-700 text-center text-theme-xs">
                                MOM-2 <br />
                                <span className="text-[10px]">(M-2 vs M-3)</span>
                            </TableCell>
                        </TableRow>
                    </TableHeader>
                    <TableBody className="divide-y divide-gray-100 dark:divide-white/[0.05]">
                        <TableRow>
                            <TableCell colSpan={13} className="px-1 py-0.5 border-r last:border-r-0 text-start font-semibold bg-gray-200 text-theme-sm dark:text-white dark:border-gray-800 dark:bg-white/[0.03]">
                                REGION
                            </TableCell>
                        </TableRow>
                        {data.map((item, index) => (
                            <Fragment key={index}>
                                <TableRow>
                                    <TableCell className="px-2.5 py-0.5 border-r last:border-r-0 text-start font-normal text-theme-xs dark:text-white dark:border-gray-800 ">
                                        &nbsp;
                                    </TableCell>
                                    <TableCell className="px-2.5 py-0.5 border-r last:border-r-0 text-start font-normal text-theme-xs dark:text-white dark:border-gray-800 ">
                                        {item.name}
                                    </TableCell>
                                    {/* M-3 */}
                                    <TableCell className="px-2.5 py-0.5 border-r last:border-r-0 text-start font-normal text-theme-xs dark:text-white dark:border-gray-800 ">
                                        {formatToBillion(Number(item.arpuM3))}
                                    </TableCell>
                                    {/* M-2 */}
                                    <TableCell className="px-2.5 py-0.5 border-r last:border-r-0 text-start font-normal text-theme-xs dark:text-white dark:border-gray-800 ">
                                        {formatToBillion(Number(item.arpuM2))}
                                    </TableCell>
                                    {/* M-1 */}
                                    <TableCell className="px-2.5 py-0.5 border-r last:border-r-0 text-start font-normal text-theme-xs dark:text-white dark:border-gray-800 ">
                                        {formatToBillion(Number(item.arpuM1))}
                                    </TableCell>
                                    {/* MTD */}
                                    <TableCell className="px-2.5 py-0.5 border-r last:border-r-0 text-start font-normal text-theme-xs dark:text-white dark:border-gray-800 ">
                                        {formatToBillion(Number(item.arpu))}
                                    </TableCell>
                                    {/* MOM */}
                                    <TableCell className="px-2.5 py-0.5 border-r last:border-r-0 text-start font-normal text-theme-xs dark:text-white dark:border-gray-800 ">
                                        <span className={cn(getGrowthColor((item.revMtd / item.subs / today) / (item.revM1 / item.subsM1 / daysInPrevMonth) - 1) ? 'text-green-500' : 'text-rose-500')}>
                                            {formatToPercentage((item.revMtd / item.subs / today) / (item.revM1 / item.subsM1 / daysInPrevMonth) - 1)}
                                        </span>
                                    </TableCell>
                                    {/* MOM1 */}
                                    <TableCell className="px-2.5 py-0.5 border-r last:border-r-0 text-start font-normal text-theme-xs dark:text-white dark:border-gray-800 ">
                                        <span className={cn(getGrowthColor((item.revM1 / item.subsM1 / daysInPrevMonth) / (item.revM2 / item.subsM2 / daysInPrevMonth2) - 1) ? 'text-green-500' : 'text-rose-500')}>
                                            {formatToPercentage((item.revM1 / item.subsM1 / daysInPrevMonth) / (item.revM2 / item.subsM2 / daysInPrevMonth2) - 1)}
                                        </span>
                                    </TableCell>
                                    {/* MOM2 */}
                                    <TableCell className="px-2.5 py-0.5 border-r last:border-r-0 text-start font-normal text-theme-xs dark:text-white dark:border-gray-800">
                                        <span className={cn(getGrowthColor((item.revM2 / item.subsM2 / daysInPrevMonth2) / (item.revM3 / item.subsM3 / daysInPrevMonth3) - 1) ? 'text-green-500' : 'text-rose-500')}>
                                            {formatToPercentage((item.revM2 / item.subsM2 / daysInPrevMonth2) / (item.revM3 / item.subsM3 / daysInPrevMonth3) - 1)}
                                        </span>
                                    </TableCell>
                                </TableRow>

                                {/* BRANCH */}
                                <TableRow>
                                    <TableCell colSpan={13} className="px-1 py-0.5 border-r last:border-r-0 text-start font-semibold bg-gray-200 dark:text-white dark:border-gray-800 dark:bg-white/[0.03] text-theme-sm">
                                        Branch
                                    </TableCell>
                                </TableRow>
                                {item.branches.map((branch, branchIndex) => (
                                    <Fragment key={`branch-${branchIndex}-${index}`}>
                                        <TableRow>
                                            <TableCell className="px-2.5 py-0.5 border-r last:border-r-0 text-start font-normal text-theme-xs dark:text-white dark:border-gray-800 ">
                                                {item.name}
                                            </TableCell>
                                            <TableCell className="px-2.5 py-0.5 border-r last:border-r-0 text-start font-normal text-theme-xs dark:text-white dark:border-gray-800 ">
                                                {branch.name}
                                            </TableCell>
                                            {/* M-3 */}
                                            <TableCell className="px-2.5 py-0.5 border-r last:border-r-0 text-start font-normal text-theme-xs dark:text-white dark:border-gray-800 ">
                                                {formatToBillion(Number(branch.arpuM3))}
                                            </TableCell>
                                            {/* M-2 */}
                                            <TableCell className="px-2.5 py-0.5 border-r last:border-r-0 text-start font-normal text-theme-xs dark:text-white dark:border-gray-800 ">
                                                {formatToBillion(Number(branch.arpuM2))}
                                            </TableCell>
                                            {/* M-1 */}
                                            <TableCell className="px-2.5 py-0.5 border-r last:border-r-0 text-start font-normal text-theme-xs dark:text-white dark:border-gray-800 ">
                                                {formatToBillion(Number(branch.arpuM1))}
                                            </TableCell>
                                            {/* MTD */}
                                            <TableCell className="px-2.5 py-0.5 border-r last:border-r-0 text-start font-normal text-theme-xs dark:text-white dark:border-gray-800 ">
                                                {formatToBillion(Number(branch.arpu))}
                                            </TableCell>
                                            {/* MOM */}
                                            <TableCell className="px-2.5 py-0.5 border-r last:border-r-0 text-start font-normal text-theme-xs dark:text-white dark:border-gray-800 ">
                                                <span className={cn(getGrowthColor((branch.revMtd / branch.subs / today) / (branch.revM1 / branch.subsM1 / daysInPrevMonth) - 1) ? 'text-green-500' : 'text-rose-500')}>
                                                    {formatToPercentage((branch.revMtd / branch.subs / today) / (branch.revM1 / branch.subsM1 / daysInPrevMonth) - 1)}
                                                </span>
                                            </TableCell>
                                            {/* MOM1 */}
                                            <TableCell className="px-2.5 py-0.5 border-r last:border-r-0 text-start font-normal text-theme-xs dark:text-white dark:border-gray-800 ">
                                                <span className={cn(getGrowthColor((branch.revM1 / branch.subsM1 / daysInPrevMonth) / (branch.revM2 / branch.subsM2 / daysInPrevMonth2) - 1) ? 'text-green-500' : 'text-rose-500')}>
                                                    {formatToPercentage((branch.revM1 / branch.subsM1 / daysInPrevMonth) / (branch.revM2 / branch.subsM2 / daysInPrevMonth2) - 1)}
                                                </span>
                                            </TableCell>
                                            {/* MOM2 */}
                                            <TableCell className="px-2.5 py-0.5 border-r last:border-r-0 text-start font-normal text-theme-xs dark:text-white dark:border-gray-800">
                                                <span className={cn(getGrowthColor((branch.revM2 / branch.subsM2 / daysInPrevMonth2) / (branch.revM3 / branch.subsM3 / daysInPrevMonth3) - 1) ? 'text-green-500' : 'text-rose-500')}>
                                                    {formatToPercentage((branch.revM2 / branch.subsM2 / daysInPrevMonth2) / (branch.revM3 / branch.subsM3 / daysInPrevMonth3) - 1)}
                                                </span>
                                            </TableCell>
                                        </TableRow>
                                    </Fragment>
                                ))}

                                {/* WOK */}
                                <TableRow>
                                    <TableCell colSpan={13} className="px-1 py-0.5 border-r last:border-r-0 text-start font-semibold bg-gray-200 dark:text-white dark:border-gray-800 dark:bg-white/[0.03] text-theme-sm">
                                        WOK
                                    </TableCell>
                                </TableRow>
                                {item.branches.map((branch, branchIndex) =>
                                    branch.woks.map((wok, wokIndex) => (
                                        <Fragment key={`wok-${wokIndex}-${branchIndex}-${index}`}>
                                            <TableRow>
                                                <TableCell className="px-2.5 py-0.5 border-r last:border-r-0 text-start font-normal text-theme-xs dark:text-white dark:border-gray-800 ">
                                                    {branch.name}
                                                </TableCell>
                                                <TableCell className="px-2.5 py-0.5 border-r last:border-r-0 text-start font-normal text-theme-xs dark:text-white dark:border-gray-800 ">
                                                    {wok.name}
                                                </TableCell>
                                                {/* M-3 */}
                                                <TableCell className="px-2.5 py-0.5 border-r last:border-r-0 text-start font-normal text-theme-xs dark:text-white dark:border-gray-800 ">
                                                    {formatToBillion(Number(wok.arpuM3))}
                                                </TableCell>
                                                {/* M-2 */}
                                                <TableCell className="px-2.5 py-0.5 border-r last:border-r-0 text-start font-normal text-theme-xs dark:text-white dark:border-gray-800 ">
                                                    {formatToBillion(Number(wok.arpuM2))}
                                                </TableCell>
                                                {/* M-1 */}
                                                <TableCell className="px-2.5 py-0.5 border-r last:border-r-0 text-start font-normal text-theme-xs dark:text-white dark:border-gray-800 ">
                                                    {formatToBillion(Number(wok.arpuM1))}
                                                </TableCell>
                                                {/* MTD */}
                                                <TableCell className="px-2.5 py-0.5 border-r last:border-r-0 text-start font-normal text-theme-xs dark:text-white dark:border-gray-800 ">
                                                    {formatToBillion(Number(wok.arpu))}
                                                </TableCell>
                                                {/* MOM */}
                                                <TableCell className="px-2.5 py-0.5 border-r last:border-r-0 text-start font-normal text-theme-xs dark:text-white dark:border-gray-800 ">
                                                    <span className={cn(getGrowthColor((wok.revMtd / wok.subs / today) / (wok.revM1 / wok.subsM1 / daysInPrevMonth) - 1) ? 'text-green-500' : 'text-rose-500')}>
                                                        {formatToPercentage((wok.revMtd / wok.subs / today) / (wok.revM1 / wok.subsM1 / daysInPrevMonth) - 1)}
                                                    </span>
                                                </TableCell>
                                                {/* MOM1 */}
                                                <TableCell className="px-2.5 py-0.5 border-r last:border-r-0 text-start font-normal text-theme-xs dark:text-white dark:border-gray-800 ">
                                                    <span className={cn(getGrowthColor((wok.revM1 / wok.subsM1 / daysInPrevMonth) / (wok.revM2 / wok.subsM2 / daysInPrevMonth2) - 1) ? 'text-green-500' : 'text-rose-500')}>
                                                        {formatToPercentage((wok.revM1 / wok.subsM1 / daysInPrevMonth) / (wok.revM2 / wok.subsM2 / daysInPrevMonth2) - 1)}
                                                    </span>
                                                </TableCell>
                                                {/* MOM2 */}
                                                <TableCell className="px-2.5 py-0.5 border-r last:border-r-0 text-start font-normal text-theme-xs dark:text-white dark:border-gray-800">
                                                    <span className={cn(getGrowthColor((wok.revM2 / wok.subsM2 / daysInPrevMonth2) / (wok.revM3 / wok.subsM3 / daysInPrevMonth3) - 1) ? 'text-green-500' : 'text-rose-500')}>
                                                        {formatToPercentage((wok.revM2 / wok.subsM2 / daysInPrevMonth2) / (wok.revM3 / wok.subsM3 / daysInPrevMonth3) - 1)}
                                                    </span>
                                                </TableCell>
                                            </TableRow>
                                        </Fragment>
                                    ))
                                )}

                                {/* STO */}
                                <TableRow>
                                    <TableCell colSpan={13} className="px-1 py-0.5 border-r last:border-r-0 text-start font-semibold bg-gray-200 dark:text-white dark:border-gray-800 dark:bg-white/[0.03] text-theme-sm">
                                        STO
                                    </TableCell>
                                </TableRow>
                                {item.branches.map((branch, branchIndex) =>
                                    branch.woks.map((wok, wokIndex) =>
                                        wok.stos.map((sto, stoIndex) => (
                                            <Fragment key={`sto-${stoIndex}-${wokIndex}-${branchIndex}-${index}`}>
                                                <TableRow>
                                                    <TableCell className="px-2.5 py-0.5 border-r last:border-r-0 text-start font-normal text-theme-xs dark:text-white dark:border-gray-800 ">
                                                        {wok.name}
                                                    </TableCell>
                                                    <TableCell className="px-2.5 py-0.5 border-r last:border-r-0 text-start font-normal text-theme-xs dark:text-white dark:border-gray-800 ">
                                                        {sto.name}
                                                    </TableCell>
                                                    {/* M-3 */}
                                                    <TableCell className="px-2.5 py-0.5 border-r last:border-r-0 text-start font-normal text-theme-xs dark:text-white dark:border-gray-800 ">
                                                        {formatToBillion(Number(sto.arpuM3))}
                                                    </TableCell>
                                                    {/* M-2 */}
                                                    <TableCell className="px-2.5 py-0.5 border-r last:border-r-0 text-start font-normal text-theme-xs dark:text-white dark:border-gray-800 ">
                                                        {formatToBillion(Number(sto.arpuM2))}
                                                    </TableCell>
                                                    {/* M-1 */}
                                                    <TableCell className="px-2.5 py-0.5 border-r last:border-r-0 text-start font-normal text-theme-xs dark:text-white dark:border-gray-800 ">
                                                        {formatToBillion(Number(sto.arpuM1))}
                                                    </TableCell>
                                                    {/* MTD */}
                                                    <TableCell className="px-2.5 py-0.5 border-r last:border-r-0 text-start font-normal text-theme-xs dark:text-white dark:border-gray-800 ">
                                                        {formatToBillion(Number(sto.arpu))}
                                                    </TableCell>
                                                    {/* MOM */}
                                                    <TableCell className="px-2.5 py-0.5 border-r last:border-r-0 text-start font-normal text-theme-xs dark:text-white dark:border-gray-800 ">
                                                        <span className={cn(getGrowthColor((sto.revMtd / sto.subs / today) / (sto.revM1 / sto.subsM1 / daysInPrevMonth) - 1) ? 'text-green-500' : 'text-rose-500')}>
                                                            {formatToPercentage((sto.revMtd / sto.subs / today) / (sto.revM1 / sto.subsM1 / daysInPrevMonth) - 1)}
                                                        </span>
                                                    </TableCell>
                                                    {/* MOM1 */}
                                                    <TableCell className="px-2.5 py-0.5 border-r last:border-r-0 text-start font-normal text-theme-xs dark:text-white dark:border-gray-800 ">
                                                        <span className={cn(getGrowthColor((sto.revM1 / sto.subsM1 / daysInPrevMonth) / (sto.revM2 / sto.subsM2 / daysInPrevMonth2) - 1) ? 'text-green-500' : 'text-rose-500')}>
                                                            {formatToPercentage((sto.revM1 / sto.subsM1 / daysInPrevMonth) / (sto.revM2 / sto.subsM2 / daysInPrevMonth2) - 1)}
                                                        </span>
                                                    </TableCell>
                                                    {/* MOM2 */}
                                                    <TableCell className="px-2.5 py-0.5 border-r last:border-r-0 text-start font-normal text-theme-xs dark:text-white dark:border-gray-800">
                                                        <span className={cn(getGrowthColor((sto.revM2 / sto.subsM2 / daysInPrevMonth2) / (sto.revM3 / sto.subsM3 / daysInPrevMonth3) - 1) ? 'text-green-500' : 'text-rose-500')}>
                                                            {formatToPercentage((sto.revM2 / sto.subsM2 / daysInPrevMonth2) / (sto.revM3 / sto.subsM3 / daysInPrevMonth3) - 1)}
                                                        </span>
                                                    </TableCell>
                                                </TableRow>
                                            </Fragment>
                                        )))
                                )}
                            </Fragment>
                        ))}
                    </TableBody>
                </Table>
            </ComponentCard>
        </div>
    )
}

export const DataTableRGB = ({ isLoading, data, title, date }: {
    isLoading?: boolean;
    data?: RegionEntity[];
    title: string;
    date?: Date
}) => {

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

    if (!data) {
        return <TableNotFound />
    }

    const selectedDate = date ? date : subDays(new Date(), 2)
    const closingDate = endOfMonth(selectedDate)
    const isEndOfMonth = selectedDate.getDate() === closingDate.getDate();
    const endOfCurrMonth = isEndOfMonth ? closingDate : selectedDate
    const isCurrMonth = format(selectedDate, 'MM') === format(new Date(), 'MM')
    const multidimDay = isCurrMonth ? format(selectedDate, 'yyyy-MM-dd') : format(closingDate, 'yyyy-MM-dd')

    const today = parseInt(format(selectedDate, 'd'));
    const daysInCurrMonth = getDaysInMonth(selectedDate)
    const daysInPrevMonth = getDaysInMonth(subMonths(selectedDate, 1))
    const daysInPrevMonth2 = getDaysInMonth(subMonths(selectedDate, 2))
    const daysInPrevMonth3 = getDaysInMonth(subMonths(selectedDate, 3))

    return (
        <div className="w-fit overflow-x-auto remove-scrollbar">
            <ComponentCard title={title} desc={<span className="text-xs font-medium">MTD: {multidimDay}</span>}>
                <Table className="w-full">
                    <TableHeader className="border-b border-gray-100 dark:border-white/[0.05]">
                        <TableRow>
                            <TableCell rowSpan={3} isHeader className="px-2.5 min-w-[80px] font-medium border-r dark:border-gray-700 text-white text-center text-theme-sm bg-rose-600">
                                &nbsp;
                            </TableCell>
                            <TableCell rowSpan={3} isHeader className="px-2.5 font-medium border-r dark:border-gray-700 text-white text-center text-theme-sm bg-rose-600">
                                Territory
                            </TableCell>
                        </TableRow>
                        <TableRow>
                            <TableCell isHeader colSpan={4} className="px-2.5 py-1 border whitespace-nowrap font-medium text-white bg-zinc-950 border-r last:border-r-0 dark:border-gray-700 text-center text-theme-xs">
                                {title}
                            </TableCell>
                            <TableCell isHeader colSpan={3} className="px-2.5 py-1 border whitespace-nowrap font-medium text-white bg-zinc-950 border-r last:border-r-0 dark:border-gray-700 text-center text-theme-xs">
                                MOM DAILY {title}
                            </TableCell>
                        </TableRow>
                        <TableRow>
                            {/* RGB ALL */}
                            <TableCell isHeader className="px-2.5 py-1 whitespace-nowrap font-medium text-white bg-zinc-700 border-r last:border-r-0 dark:border-r-gray-700 text-center text-theme-xs">
                                FM M-3
                            </TableCell>
                            <TableCell isHeader className="px-2.5 py-1 whitespace-nowrap font-medium text-white bg-zinc-700 border-r last:border-r-0 dark:border-r-gray-700 text-center text-theme-xs">
                                FM M-2
                            </TableCell>
                            <TableCell isHeader className="px-2.5 py-1 whitespace-nowrap font-medium text-white bg-zinc-700 border-r last:border-r-0 dark:border-r-gray-700 text-center text-theme-xs">
                                FM M-1
                            </TableCell>
                            <TableCell isHeader className="px-2.5 py-1 whitespace-nowrap font-medium text-white bg-zinc-700 border-r last:border-r-0 dark:border-r-gray-700 text-center text-theme-xs">
                                MTD
                            </TableCell>
                            <TableCell isHeader className="px-2.5 py-1 whitespace-nowrap font-medium text-white bg-zinc-700 border-r last:border-r-0 dark:border-r-gray-700 text-center text-theme-xs">
                                MOM <br />
                                <span className="text-[10px]">(MTD vs M-1)</span>
                            </TableCell>
                            <TableCell isHeader className="px-2.5 py-1 whitespace-nowrap font-medium text-white bg-zinc-700 border-r last:border-r-0 dark:border-r-gray-700 text-center text-theme-xs">
                                MOM-1 <br />
                                <span className="text-[10px]">(M-1 vs M-2)</span>
                            </TableCell>
                            <TableCell isHeader className="px-2.5 py-1 whitespace-nowrap font-medium text-white bg-zinc-700 border-r last:border-r-0 dark:border-r-gray-700 text-center text-theme-xs">
                                MOM-2 <br />
                                <span className="text-[10px]">(M-2 vs M-3)</span>
                            </TableCell>
                        </TableRow>
                    </TableHeader>
                    <TableBody className="divide-y divide-gray-100 dark:divide-white/[0.05]">
                        <TableRow>
                            <TableCell colSpan={13} className="px-1 py-0.5 border-r last:border-r-0 text-start font-semibold bg-gray-200 text-theme-sm dark:text-white dark:border-gray-800 dark:bg-white/[0.03]">
                                REGION
                            </TableCell>
                        </TableRow>
                        {data.map((item, index) => (
                            <Fragment key={index}>
                                <TableRow>
                                    <TableCell className="px-2.5 py-0.5 border-r last:border-r-0 text-start font-normal text-theme-xs dark:text-white dark:border-gray-800 ">
                                        &nbsp;
                                    </TableCell>
                                    <TableCell className="px-2.5 py-0.5 border-r last:border-r-0 text-start font-normal text-theme-xs dark:text-white dark:border-gray-800 ">
                                        {item.name}
                                    </TableCell>
                                    {/* ALL */}
                                    {/* M-3 */}
                                    <TableCell className="px-2.5 py-0.5 border-r last:border-r-0 text-start font-normal text-theme-xs dark:text-white dark:border-gray-800 ">
                                        <span className="tabular-nums">
                                            {formatToBillion(item.rgbM3)}
                                        </span>
                                    </TableCell>
                                    {/* M-2 */}
                                    <TableCell className="px-2.5 py-0.5 border-r last:border-r-0 text-start font-normal text-theme-xs dark:text-white dark:border-gray-800 ">
                                        <span className="tabular-nums">
                                            {formatToBillion(item.rgbM2)}
                                        </span>
                                    </TableCell>
                                    {/* M-1 */}
                                    <TableCell className="px-2.5 py-0.5 border-r last:border-r-0 text-start font-normal text-theme-xs dark:text-white dark:border-gray-800 ">
                                        <span className="tabular-nums">
                                            {formatToBillion(item.rgbM1)}
                                        </span>
                                    </TableCell>
                                    {/* MTD */}
                                    <TableCell className="px-2.5 py-0.5 border-r last:border-r-0 text-start font-normal text-theme-xs dark:text-white dark:border-gray-800 ">
                                        <span className="tabular-nums">
                                            {formatToBillion(item.rgbMtd)}
                                        </span>
                                    </TableCell>
                                    {/* MOM */}
                                    <TableCell className="px-2.5 py-0.5 border-r last:border-r-0 text-start font-normal text-theme-xs dark:text-white dark:border-gray-800 ">
                                        <span className={cn(getGrowthColor((item.rgbMtd / today) / (item.rgbM1 / daysInPrevMonth) - 1) ? 'text-green-500' : 'text-rose-500')}>
                                            {formatToPercentage((item.rgbMtd / today) / (item.rgbM1 / daysInPrevMonth) - 1)}
                                        </span>
                                    </TableCell>
                                    {/* MOM1 */}
                                    <TableCell className="px-2.5 py-0.5 border-r last:border-r-0 text-start font-normal text-theme-xs dark:text-white dark:border-gray-800 ">
                                        <span className={cn(getGrowthColor((item.rgbM1 / daysInPrevMonth) / (item.rgbM2 / daysInPrevMonth2) - 1) ? 'text-green-500' : 'text-rose-500')}>
                                            {formatToPercentage((item.rgbM1 / daysInPrevMonth) / (item.rgbM2 / daysInPrevMonth2) - 1)}
                                        </span>
                                    </TableCell>
                                    {/* MOM2 */}
                                    <TableCell className="px-2.5 py-0.5 border-r last:border-r-0 text-start font-normal text-theme-xs dark:text-white dark:border-gray-800">
                                        <span className={cn(getGrowthColor((item.rgbM2 / daysInPrevMonth2) / (item.rgbM3 / daysInPrevMonth3) - 1) ? 'text-green-500' : 'text-rose-500')}>
                                            {formatToPercentage((item.rgbM2 / daysInPrevMonth2) / (item.rgbM3 / daysInPrevMonth3) - 1)}
                                        </span>
                                    </TableCell>
                                </TableRow>

                                {/* BRANCH */}
                                <TableRow>
                                    <TableCell colSpan={13} className="px-1 py-0.5 border-r last:border-r-0 text-start font-semibold bg-gray-200 dark:text-white dark:border-gray-800 dark:bg-white/[0.03] text-theme-sm">
                                        BRANCH
                                    </TableCell>
                                </TableRow>
                                {item.branches.map((branch, branchIndex) => (
                                    <Fragment key={`branch-${branchIndex}-${index}`}>
                                        <TableRow>
                                            <TableCell className="px-2.5 py-0.5 border-r last:border-r-0 text-start font-normal text-theme-xs dark:text-white dark:border-gray-800 ">
                                                {item.name}
                                            </TableCell>
                                            <TableCell className="px-2.5 py-0.5 border-r last:border-r-0 text-start font-normal text-theme-xs dark:text-white dark:border-gray-800 ">
                                                {branch.name}
                                            </TableCell>
                                            {/* M-3 */}
                                            <TableCell className="px-2.5 py-0.5 border-r last:border-r-0 text-start font-normal text-theme-xs dark:text-white dark:border-gray-800 ">
                                                <span className="tabular-nums">
                                                    {formatToBillion(branch.rgbM3)}
                                                </span>
                                            </TableCell>
                                            {/* M-2 */}
                                            <TableCell className="px-2.5 py-0.5 border-r last:border-r-0 text-start font-normal text-theme-xs dark:text-white dark:border-gray-800 ">
                                                <span className="tabular-nums">
                                                    {formatToBillion(branch.rgbM2)}
                                                </span>
                                            </TableCell>
                                            {/* M-1 */}
                                            <TableCell className="px-2.5 py-0.5 border-r last:border-r-0 text-start font-normal text-theme-xs dark:text-white dark:border-gray-800 ">
                                                <span className="tabular-nums">
                                                    {formatToBillion(branch.rgbM1)}
                                                </span>
                                            </TableCell>
                                            {/* MTD */}
                                            <TableCell className="px-2.5 py-0.5 border-r last:border-r-0 text-start font-normal text-theme-xs dark:text-white dark:border-gray-800 ">
                                                <span className="tabular-nums">
                                                    {formatToBillion(branch.rgbMtd)}
                                                </span>
                                            </TableCell>
                                            {/* MOM */}
                                            <TableCell className="px-2.5 py-0.5 border-r last:border-r-0 text-start font-normal text-theme-xs dark:text-white dark:border-gray-800 ">
                                                <span className={cn(getGrowthColor((branch.rgbMtd / today) / (branch.rgbM1 / daysInPrevMonth) - 1) ? 'text-green-500' : 'text-rose-500')}>
                                                    {formatToPercentage((branch.rgbMtd / today) / (branch.rgbM1 / daysInPrevMonth) - 1)}
                                                </span>
                                            </TableCell>
                                            {/* MOM1 */}
                                            <TableCell className="px-2.5 py-0.5 border-r last:border-r-0 text-start font-normal text-theme-xs dark:text-white dark:border-gray-800 ">
                                                <span className={cn(getGrowthColor((branch.rgbM1 / daysInPrevMonth) / (branch.rgbM2 / daysInPrevMonth2) - 1) ? 'text-green-500' : 'text-rose-500')}>
                                                    {formatToPercentage((branch.rgbM1 / daysInPrevMonth) / (branch.rgbM2 / daysInPrevMonth2) - 1)}
                                                </span>
                                            </TableCell>
                                            {/* MOM2 */}
                                            <TableCell className="px-2.5 py-0.5 border-r last:border-r-0 text-start font-normal text-theme-xs dark:text-white dark:border-gray-800">
                                                <span className={cn(getGrowthColor((branch.rgbM2 / daysInPrevMonth2) / (branch.rgbM3 / daysInPrevMonth3) - 1) ? 'text-green-500' : 'text-rose-500')}>
                                                    {formatToPercentage((branch.rgbM2 / daysInPrevMonth2) / (branch.rgbM3 / daysInPrevMonth3) - 1)}
                                                </span>
                                            </TableCell>
                                        </TableRow>
                                    </Fragment>
                                ))}

                                {/* WOK */}
                                <TableRow>
                                    <TableCell colSpan={13} className="px-1 py-0.5 border-r last:border-r-0 text-start font-semibold bg-gray-200 dark:text-white dark:border-gray-800 dark:bg-white/[0.03] text-theme-sm">
                                        WOK
                                    </TableCell>
                                </TableRow>
                                {item.branches.map((branch, branchIndex) =>
                                    branch.woks.map((wok, wokIndex) => (
                                        <Fragment key={`wok-${wokIndex}-${branchIndex}-${index}`}>
                                            <TableRow>
                                                <TableCell className="px-2.5 py-0.5 border-r last:border-r-0 text-start font-normal text-theme-xs dark:text-white dark:border-gray-800 ">
                                                    {branch.name}
                                                </TableCell>
                                                <TableCell className="px-2.5 py-0.5 border-r last:border-r-0 text-start font-normal text-theme-xs dark:text-white dark:border-gray-800 ">
                                                    {wok.name}
                                                </TableCell>
                                                {/* M-3 */}
                                                <TableCell className="px-2.5 py-0.5 border-r last:border-r-0 text-start font-normal text-theme-xs dark:text-white dark:border-gray-800 ">
                                                    <span className="tabular-nums">
                                                        {formatToBillion(wok.rgbM3)}
                                                    </span>
                                                </TableCell>
                                                {/* M-2 */}
                                                <TableCell className="px-2.5 py-0.5 border-r last:border-r-0 text-start font-normal text-theme-xs dark:text-white dark:border-gray-800 ">
                                                    <span className="tabular-nums">
                                                        {formatToBillion(wok.rgbM2)}
                                                    </span>
                                                </TableCell>
                                                {/* M-1 */}
                                                <TableCell className="px-2.5 py-0.5 border-r last:border-r-0 text-start font-normal text-theme-xs dark:text-white dark:border-gray-800 ">
                                                    <span className="tabular-nums">
                                                        {formatToBillion(wok.rgbM1)}
                                                    </span>
                                                </TableCell>
                                                {/* MTD */}
                                                <TableCell className="px-2.5 py-0.5 border-r last:border-r-0 text-start font-normal text-theme-xs dark:text-white dark:border-gray-800 ">
                                                    <span className="tabular-nums">
                                                        {formatToBillion(wok.rgbMtd)}
                                                    </span>
                                                </TableCell>
                                                {/* MOM */}
                                                <TableCell className="px-2.5 py-0.5 border-r last:border-r-0 text-start font-normal text-theme-xs dark:text-white dark:border-gray-800 ">
                                                    <span className={cn(getGrowthColor((wok.rgbMtd / today) / (wok.rgbM1 / daysInPrevMonth) - 1) ? 'text-green-500' : 'text-rose-500')}>
                                                        {formatToPercentage((wok.rgbMtd / today) / (wok.rgbM1 / daysInPrevMonth) - 1)}
                                                    </span>
                                                </TableCell>
                                                {/* MOM1 */}
                                                <TableCell className="px-2.5 py-0.5 border-r last:border-r-0 text-start font-normal text-theme-xs dark:text-white dark:border-gray-800 ">
                                                    <span className={cn(getGrowthColor((wok.rgbM1 / daysInPrevMonth) / (wok.rgbM2 / daysInPrevMonth2) - 1) ? 'text-green-500' : 'text-rose-500')}>
                                                        {formatToPercentage((wok.rgbM1 / daysInPrevMonth) / (wok.rgbM2 / daysInPrevMonth2) - 1)}
                                                    </span>
                                                </TableCell>
                                                {/* MOM2 */}
                                                <TableCell className="px-2.5 py-0.5 border-r last:border-r-0 text-start font-normal text-theme-xs dark:text-white dark:border-gray-800">
                                                    <span className={cn(getGrowthColor((wok.rgbM2 / daysInPrevMonth2) / (wok.rgbM3 / daysInPrevMonth3) - 1) ? 'text-green-500' : 'text-rose-500')}>
                                                        {formatToPercentage((wok.rgbM2 / daysInPrevMonth2) / (wok.rgbM3 / daysInPrevMonth3) - 1)}
                                                    </span>
                                                </TableCell>
                                            </TableRow>
                                        </Fragment>
                                    ))
                                )}

                                {/* STO */}
                                <TableRow>
                                    <TableCell colSpan={13} className="px-1 py-0.5 border-r last:border-r-0 text-start font-semibold bg-gray-200 dark:text-white dark:border-gray-800 dark:bg-white/[0.03] text-theme-sm">
                                        STO
                                    </TableCell>
                                </TableRow>
                                {item.branches.map((branch, branchIndex) =>
                                    branch.woks.map((wok, wokIndex) =>
                                        wok.stos.map((sto, stoIndex) => (
                                            <Fragment key={`sto-${stoIndex}-${wokIndex}-${branchIndex}-${index}`}>
                                                <TableRow>
                                                    <TableCell className="px-2.5 py-0.5 border-r last:border-r-0 text-start font-normal text-theme-xs dark:text-white dark:border-gray-800 ">
                                                        {wok.name}
                                                    </TableCell>
                                                    <TableCell className="px-2.5 py-0.5 border-r last:border-r-0 text-start font-normal text-theme-xs dark:text-white dark:border-gray-800 ">
                                                        {sto.name}
                                                    </TableCell>
                                                    {/* M-3 */}
                                                    <TableCell className="px-2.5 py-0.5 border-r last:border-r-0 text-start font-normal text-theme-xs dark:text-white dark:border-gray-800 ">
                                                        <span className="tabular-nums">
                                                            {formatToBillion(sto.rgbM3)}
                                                        </span>
                                                    </TableCell>
                                                    {/* M-2 */}
                                                    <TableCell className="px-2.5 py-0.5 border-r last:border-r-0 text-start font-normal text-theme-xs dark:text-white dark:border-gray-800 ">
                                                        <span className="tabular-nums">
                                                            {formatToBillion(sto.rgbM2)}
                                                        </span>
                                                    </TableCell>
                                                    {/* M-1 */}
                                                    <TableCell className="px-2.5 py-0.5 border-r last:border-r-0 text-start font-normal text-theme-xs dark:text-white dark:border-gray-800 ">
                                                        <span className="tabular-nums">
                                                            {formatToBillion(sto.rgbM1)}
                                                        </span>
                                                    </TableCell>
                                                    {/* MTD */}
                                                    <TableCell className="px-2.5 py-0.5 border-r last:border-r-0 text-start font-normal text-theme-xs dark:text-white dark:border-gray-800 ">
                                                        <span className="tabular-nums">
                                                            {formatToBillion(sto.rgbMtd)}
                                                        </span>
                                                    </TableCell>
                                                    {/* MOM */}
                                                    <TableCell className="px-2.5 py-0.5 border-r last:border-r-0 text-start font-normal text-theme-xs dark:text-white dark:border-gray-800 ">
                                                        <span className={cn(getGrowthColor((sto.rgbMtd / today) / (sto.rgbM1 / daysInPrevMonth) - 1) ? 'text-green-500' : 'text-rose-500')}>
                                                            {formatToPercentage((sto.rgbMtd / today) / (sto.rgbM1 / daysInPrevMonth) - 1)}
                                                        </span>
                                                    </TableCell>
                                                    {/* MOM1 */}
                                                    <TableCell className="px-2.5 py-0.5 border-r last:border-r-0 text-start font-normal text-theme-xs dark:text-white dark:border-gray-800 ">
                                                        <span className={cn(getGrowthColor((sto.rgbM1 / daysInPrevMonth) / (sto.rgbM2 / daysInPrevMonth2) - 1) ? 'text-green-500' : 'text-rose-500')}>
                                                            {formatToPercentage((sto.rgbM1 / daysInPrevMonth) / (sto.rgbM2 / daysInPrevMonth2) - 1)}
                                                        </span>
                                                    </TableCell>
                                                    {/* MOM2 */}
                                                    <TableCell className="px-2.5 py-0.5 border-r last:border-r-0 text-start font-normal text-theme-xs dark:text-white dark:border-gray-800">
                                                        <span className={cn(getGrowthColor((sto.rgbM2 / daysInPrevMonth2) / (sto.rgbM3 / daysInPrevMonth3) - 1) ? 'text-green-500' : 'text-rose-500')}>
                                                            {formatToPercentage((sto.rgbM2 / daysInPrevMonth2) / (sto.rgbM3 / daysInPrevMonth3) - 1)}
                                                        </span>
                                                    </TableCell>
                                                </TableRow>
                                            </Fragment>
                                        )))
                                )}
                            </Fragment>
                        ))}
                    </TableBody>
                </Table>
            </ComponentCard>
        </div>
    )
}

interface RevenueBase {
    name: string;
    rgbMtd: number;
    rgbM1: number;
    rgbM2: number;
    rgbM3: number;
}

// STO (Store) level entity
interface StoEntity extends RevenueBase {
    // No additional nested structures at the STO level
}

// WOK level entity
interface WokEntity extends RevenueBase {
    stos: StoEntity[];
}

// Branch level entity
interface BranchEntity extends RevenueBase {
    woks: WokEntity[];
}

// Region level entity (top level)
interface RegionEntity extends RevenueBase {
    branches: BranchEntity[];
}