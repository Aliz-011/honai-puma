'use client'

import PageBreadcrumb from "@/components/common/PageBreadCrumb";
import { TableData } from "@/components/data-table";
import { Filters } from "@/components/filters";

import { useSelectDate } from "@/hooks/use-select-date";
import { useGetTrxSAPrabayar } from "@/modules/trx-sa/hooks/use-get-trx-sa-prabayar";

const TrxSAPrabayarPage = () => {
    const { date: selectedDate } = useSelectDate()
    const { data, isLoading, refetch } = useGetTrxSAPrabayar({ date: selectedDate })

    return (
        <div>
            <PageBreadcrumb pageTitle="Trx SA Prabayar" />
            <div className="overflow-hidden min-h-screen rounded-2xl border border-gray-200 bg-white px-5 py-7 dark:border-gray-800 dark:bg-white/[0.03] space-y-4">
                <Filters daysBehind={3} />
                <TableData data={data} title="Trx SA Prabayar" latestUpdatedData={3} selectedDate={selectedDate} isLoading={isLoading} refetch={refetch} />
            </div>
        </div>
    )
}

export default TrxSAPrabayarPage