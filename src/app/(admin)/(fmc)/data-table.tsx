'use client'

import ComponentCard from "@/components/common/ComponentCard"
import { Table, TableBody, TableCell, TableHeader, TableRow } from "@/components/ui/table"

export const DataTable = () => {
    return (
        <div className="w-fit overflow-x-auto remove-scrollbar">
            <ComponentCard title="FMC Line In Service">
                <Table className="w-full">
                    <TableHeader className="border-b border-gray-100 dark:border-white/[0.05]">
                        <TableRow>
                            <TableCell rowSpan={3} isHeader className="px-2.5 font-medium border-r dark:border-gray-700 text-white text-center text-theme-sm bg-rose-700">
                                Territory
                            </TableCell>
                        </TableRow>
                        <TableRow>
                            <TableCell isHeader colSpan={4} className="px-2.5 py-1 border whitespace-nowrap font-medium text-white bg-zinc-950 border-r last:border-r-0 dark:border-gray-700 text-center text-theme-xs">
                                Revenue
                            </TableCell>
                            <TableCell isHeader rowSpan={2} className="px-2.5 py-1 border whitespace-nowrap font-medium text-white bg-zinc-950 border-r last:border-r-0 dark:border-gray-700 text-center text-theme-xs">
                                ARPU
                            </TableCell>
                            <TableCell isHeader rowSpan={2} className="px-2.5 py-1 border whitespace-nowrap font-medium text-white bg-zinc-950 border-r last:border-r-0 dark:border-gray-700 text-center text-theme-xs">
                                Payload
                            </TableCell>
                            <TableCell isHeader rowSpan={2} className="px-2.5 py-1 border whitespace-nowrap font-medium text-white bg-zinc-950 border-r last:border-r-0 dark:border-gray-700 text-center text-theme-xs">
                                Package
                            </TableCell>
                            <TableCell isHeader rowSpan={2} className="px-2.5 py-1 border whitespace-nowrap font-medium text-white bg-zinc-950 border-r last:border-r-0 dark:border-gray-700 text-center text-theme-xs">
                                Msisdn
                            </TableCell>
                        </TableRow>
                        <TableRow>
                            <TableCell isHeader className="px-2.5 py-1 whitespace-nowrap font-medium text-white bg-zinc-950 border-r last:border-r-0 dark:border-r-gray-700 text-center text-theme-xs">
                                M-3
                            </TableCell>
                            <TableCell isHeader className="px-2.5 py-1 whitespace-nowrap font-medium text-white bg-zinc-950 border-r last:border-r-0 dark:border-r-gray-700 text-center text-theme-xs">
                                M-2
                            </TableCell>
                            <TableCell isHeader className="px-2.5 py-1 whitespace-nowrap font-medium text-white bg-zinc-950 border-r last:border-r-0 dark:border-r-gray-700 text-center text-theme-xs">
                                M-1
                            </TableCell>
                            <TableCell isHeader className="px-2.5 py-1 whitespace-nowrap font-medium text-white bg-zinc-950 border-r last:border-r-0 dark:border-r-gray-700 text-center text-theme-xs">
                                MTD
                            </TableCell>
                        </TableRow>
                    </TableHeader>
                    <TableBody className="divide-y divide-gray-100 dark:divide-white/[0.05]">
                        {/* REGIONALS */}
                        <TableRow>
                            <TableCell colSpan={13} className="px-1 py-0.5 border-r last:border-r-0 text-start font-semibold bg-gray-200 text-theme-sm dark:text-white dark:border-gray-800 dark:bg-white/[0.03]">
                                Regional
                            </TableCell>
                        </TableRow>
                        <TableRow>
                            <TableCell className="px-1 py-0.5 border-r last:border-r-0 text-start font-normal text-theme-xs dark:text-white dark:border-gray-800 ">
                                MALUKU DAN PAPUA
                            </TableCell>
                            {/* M-3 */}
                            <TableCell className="px-1 py-0.5 border-r last:border-r-0 text-start font-normal text-theme-xs dark:text-white dark:border-gray-800 ">
                                10000
                            </TableCell>
                            {/* M-2 */}
                            <TableCell className="px-1 py-0.5 border-r last:border-r-0 text-start font-normal text-theme-xs dark:text-white dark:border-gray-800 ">
                                0
                            </TableCell>
                            {/* M-1 */}
                            <TableCell className="px-1 py-0.5 border-r last:border-r-0 text-start font-normal text-theme-xs dark:text-white dark:border-gray-800 ">
                                27000
                            </TableCell>
                            {/* MTD */}
                            <TableCell className="px-1 py-0.5 border-r last:border-r-0 text-start font-normal text-theme-xs dark:text-white dark:border-gray-800 ">
                                9600
                            </TableCell>
                            {/* ARPU */}
                            <TableCell className="px-1 py-0.5 border-r last:border-r-0 text-start font-normal text-theme-xs dark:text-white dark:border-gray-800 ">
                                9600
                            </TableCell>
                            {/* PAYLOAD */}
                            <TableCell className="px-1 py-0.5 border-r last:border-r-0 text-start font-normal text-theme-xs dark:text-white dark:border-gray-800 ">
                                1825277
                            </TableCell>
                            <TableCell className="px-1 py-0.5 border-r last:border-r-0 text-start font-normal text-theme-xs dark:text-white dark:border-gray-800 ">
                                INDIHOME_REGULAR
                            </TableCell>
                            <TableCell className="px-1 py-0.5 border-r last:border-r-0 text-start font-normal text-theme-xs dark:text-white dark:border-gray-800 ">
                                6281344917764
                            </TableCell>
                        </TableRow>
                    </TableBody>
                </Table>
            </ComponentCard>
        </div>
    )
}