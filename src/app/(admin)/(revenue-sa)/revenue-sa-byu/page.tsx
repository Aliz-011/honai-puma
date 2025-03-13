'use client'

import PageBreadcrumb from "@/components/common/PageBreadCrumb";
import { Filters } from "@/components/filters";
import { TableData } from "@/components/data-table";

import { useSelectDate } from "@/hooks/use-select-date";
import { useGetRevenueSAByu } from "@/modules/revenue-sa/hooks/use-get-revenue-sa-byu";

const RevenueSAByUPage = () => {
    const { date: selectedDate } = useSelectDate()
    const { data: revenues, isLoading: isLoadingRevenue, isRefetching, refetch } = useGetRevenueSAByu({ date: selectedDate })

    return (
        <div>
            <PageBreadcrumb pageTitle="Revenue SA ByU" />
            <div className="overflow-hidden min-h-screen rounded-2xl border border-gray-200 bg-white px-5 py-7 dark:border-gray-800 dark:bg-white/[0.03] space-y-8">
                <Filters daysBehind={3} />
                <TableData data={revenues} latestUpdatedData={2} refetch={refetch} selectedDate={selectedDate} title="Revenue SA ByU" isLoading={isLoadingRevenue || isRefetching} />
            </div>
        </div>
    )
}

export default RevenueSAByUPage