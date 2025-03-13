'use client'

import PageBreadcrumb from "@/components/common/PageBreadCrumb";
import { TableData } from "@/components/data-table";
import { Filters } from "@/components/filters";

import { useSelectDate } from "@/hooks/use-select-date";
import { useGetRevenueByu } from "@/modules/revenue-gross/hooks/use-get-revenue-byu";

const RevenueByUPage = () => {
    const { date: selectedDate } = useSelectDate()
    const { data: revenues, isLoading: isLoadingRevenue, isRefetching, refetch } = useGetRevenueByu({ date: selectedDate })

    return (
        <div>
            <PageBreadcrumb pageTitle="Revenue ByU" />
            <div className="overflow-hidden min-h-screen rounded-2xl border border-gray-200 bg-white px-5 py-7 dark:border-gray-800 dark:bg-white/[0.03] space-y-4">
                <Filters daysBehind={2} />
                <TableData data={revenues} selectedDate={selectedDate} isLoading={isLoadingRevenue || isRefetching} refetch={refetch} latestUpdatedData={2} title="Revenue ByU" />
            </div>
        </div>
    )
}

export default RevenueByUPage