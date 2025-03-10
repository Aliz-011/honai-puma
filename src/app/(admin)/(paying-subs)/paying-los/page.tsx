'use client'

import PageBreadcrumb from "@/components/common/PageBreadCrumb";
import { Filters } from "@/components/filters";
import { TableData } from "@/components/data-table";
import { useGetPayingLos } from "@/modules/paying-los/hooks/use-get-paying-los";
import { useSelectDate } from "@/hooks/use-select-date";


const PayingLosPage = () => {
    const { date: selectedDate } = useSelectDate()
    const { data, isLoading } = useGetPayingLos({ date: selectedDate })

    return (
        <div>
            <PageBreadcrumb pageTitle="Paying LOS 0-1" />
            <div className="overflow-hidden min-h-screen rounded-2xl border border-gray-200 bg-white px-5 py-7 dark:border-gray-800 dark:bg-white/[0.03] space-y-4">
                <Filters />
                <TableData data={data} latestUpdatedData={3} selectedDate={selectedDate} title="Paying LOS 0-1" isLoading={isLoading} />
            </div>
        </div>
    )
}

export default PayingLosPage