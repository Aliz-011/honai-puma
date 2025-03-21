'use client'

import PageBreadcrumb from "@/components/common/PageBreadCrumb";
import { TableData } from "@/components/data-table";
import { Filters } from "@/components/filters";
import { useSelectDate } from "@/hooks/use-select-date";
import { useGetRevenueSAPrabayar } from "@/modules/revenue-sa/hooks/use-get-revenue-sa-prabayar";

const RevenueSAPage = () => {
    const { date: selectedDate } = useSelectDate()
    const { data, isLoading, isRefetching, refetch } = useGetRevenueSAPrabayar({ date: selectedDate })
    return (
        <div>
            <PageBreadcrumb pageTitle="Revenue SA Prabayar" />
            <div className="overflow-hidden min-h-screen rounded-2xl border border-gray-200 bg-white px-5 py-7 dark:border-gray-800 dark:bg-white/[0.03] space-y-8">
                <Filters daysBehind={3} />
                <TableData refetch={refetch} data={data} isLoading={isLoading} latestUpdatedData={3} title="Revenue SA Prabayar" />
            </div>
        </div>
    )
}

export default RevenueSAPage