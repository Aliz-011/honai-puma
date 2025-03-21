'use client'

import PageBreadcrumb from "@/components/common/PageBreadCrumb"
import { TableData } from "@/components/data-table"
import { Filters } from "@/components/filters"
import { useSelectDate } from "@/hooks/use-select-date"
import { useGetRevenueCVMOutlet } from "@/modules/revenue-cvm/hooks/use-get-revenue-cvm-outlet"

const RevenueCVMOutletPage = () => {
    const { date: selectedDate } = useSelectDate()
    const { data: revenues, isLoading, isRefetching, refetch } = useGetRevenueCVMOutlet({ date: selectedDate })

    return (
        <div>
            <PageBreadcrumb pageTitle="Revenue CVM Outlet" />
            <div className="overflow-hidden min-h-screen rounded-2xl border border-gray-200 bg-white px-5 py-7 dark:border-gray-800 dark:bg-white/[0.03] space-y-4">
                <Filters daysBehind={1} />
                <TableData title="Revenue CVM Outlet" data={revenues} latestUpdatedData={1} selectedDate={selectedDate} isLoading={isLoading || isRefetching} refetch={refetch} />
            </div>
        </div>
    )
}
export default RevenueCVMOutletPage