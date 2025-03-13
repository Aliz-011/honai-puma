'use client'

import PageBreadcrumb from "@/components/common/PageBreadCrumb";
import { TableData } from "@/components/data-table";
import { Filters } from "@/components/filters";
import { useSelectDate } from "@/hooks/use-select-date";
import { useGetRevenueSA } from "@/modules/revenue-sa/hooks/use-get-revenue-sa";

const RevenueSAPage = () => {
    const { date: selectedDate } = useSelectDate()
    const { data: revenues, isLoading: isLoadingRevenue, isRefetching, refetch } = useGetRevenueSA({ date: selectedDate })
    return (
        <div>
            <PageBreadcrumb pageTitle="Revenue SA" />
            <div className="overflow-hidden min-h-screen rounded-2xl border border-gray-200 bg-white px-5 py-7 dark:border-gray-800 dark:bg-white/[0.03] space-y-4">
                <Filters daysBehind={3} />
                <TableData latestUpdatedData={3} data={revenues} selectedDate={selectedDate} title="Revenue SA" isLoading={isLoadingRevenue || isRefetching} refetch={refetch} />
            </div>
        </div>
    )
}

export default RevenueSAPage