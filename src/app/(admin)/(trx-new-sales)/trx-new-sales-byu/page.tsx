'use client'

import PageBreadcrumb from "@/components/common/PageBreadCrumb";
import { Filters } from "@/components/filters";
import { TableData } from "@/components/data-table";

import { useSelectDate } from "@/hooks/use-select-date";
import { useGetTrxNewSalesByu } from "@/modules/trx-new-sales/hooks/use-get-trx-new-sales-byu";

const TrxNewSalesPrabayarPage = () => {
    const { date: selectedDate } = useSelectDate()
    const { data, isLoading, refetch } = useGetTrxNewSalesByu({ date: selectedDate })

    return (
        <div>
            <PageBreadcrumb pageTitle="Trx New Sales ByU" />
            <div className="overflow-hidden min-h-screen rounded-2xl border border-gray-200 bg-white px-5 py-7 dark:border-gray-800 dark:bg-white/[0.03] space-y-4">
                <Filters daysBehind={2} />
                <TableData data={data} latestUpdatedData={2} selectedDate={selectedDate} title="Trx New Sales ByU" isLoading={isLoading} refetch={refetch} />
            </div>
        </div>
    )
}

export default TrxNewSalesPrabayarPage