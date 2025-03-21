'use client'

import PageBreadcrumb from "@/components/common/PageBreadCrumb";
import { TableData } from "@/components/data-table";
import { Filters } from "@/components/filters";

import { useSelectDate } from "@/hooks/use-select-date";
import { useGetTrxSA } from "@/modules/trx-sa/hooks/use-get-trx-sa";

const TrxSAPage = () => {
    const { date: selectedDate } = useSelectDate()
    const { data: revenues, isLoading: isLoadingRevenue, isRefetching, refetch } = useGetTrxSA({ date: selectedDate })
    return (
        <div>
            <PageBreadcrumb pageTitle="Trx SA" />
            <div className="overflow-hidden min-h-screen rounded-2xl border border-gray-200 bg-white px-5 py-7 dark:border-gray-800 dark:bg-white/[0.03] space-y-4">
                <Filters daysBehind={3} />
                <TableData data={revenues} refetch={refetch} isLoading={isLoadingRevenue} title="Trx SA" latestUpdatedData={3} selectedDate={selectedDate} />
            </div>
        </div>
    )
}

export default TrxSAPage