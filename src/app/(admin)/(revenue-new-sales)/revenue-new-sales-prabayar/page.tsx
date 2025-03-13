'use client'

import PageBreadcrumb from "@/components/common/PageBreadCrumb";
import { TableData } from "@/components/data-table";
import { Filters } from "@/components/filters";

import { useSelectDate } from "@/hooks/use-select-date";
import { useGetNewSalesPrabayar } from "@/modules/revenue-new-sales/hooks/use-get-new-sales-prabayar";

const RevenueNewSalesPrabayarPage = () => {
    const { date } = useSelectDate()
    const { data, isLoading, isRefetching, refetch } = useGetNewSalesPrabayar({ date })

    return (
        <div>
            <PageBreadcrumb pageTitle="Revenue New Sales Prabayar" />
            <div className="overflow-hidden min-h-screen rounded-2xl border border-gray-200 bg-white px-5 py-7 dark:border-gray-800 dark:bg-white/[0.03] space-y-4">
                <Filters daysBehind={2} />
                <TableData data={data} latestUpdatedData={2} title="Revenue New Sales Prabayar" isLoading={isLoading || isRefetching} refetch={refetch} selectedDate={date} />
            </div>
        </div>
    )
}

export default RevenueNewSalesPrabayarPage