'use client'

import PageBreadcrumb from "@/components/common/PageBreadCrumb";
import { Filters } from "@/components/filters";
import { TableData } from "@/components/data-table";
import { useSelectDate } from "@/hooks/use-select-date";
import { useGetPayingLosPrabayar } from "@/modules/paying-los/hooks/use-get-paying-los-prabayar";


const PayingLosPrabayarPage = () => {
    const { date: selectedDate } = useSelectDate()
    const { data, isLoading } = useGetPayingLosPrabayar({ date: selectedDate })

    return (
        <div>
            <PageBreadcrumb pageTitle="Paying LOS 0-1 Prabayar" />
            <div className="overflow-hidden min-h-screen rounded-2xl border border-gray-200 bg-white px-5 py-7 dark:border-gray-800 dark:bg-white/[0.03] space-y-4">
                <Filters />
                <TableData data={data} latestUpdatedData={3} selectedDate={selectedDate} title="Paying LOS 0-1 Prabayar" isLoading={isLoading} />
            </div>
        </div>
    )
}

export default PayingLosPrabayarPage