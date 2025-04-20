'use client'

import PageBreadcrumb from "@/components/common/PageBreadCrumb"
import { Filter } from "../filter"
import { DataTable, DataTableARPU } from "../data-table"
import { useGetLineInService } from "@/modules/fmc/hooks/use-get-linein-service"
import { useSelectDateFmc } from "@/hooks/use-select-date-fmc"

const LineInServicePage = () => {
    const { date: selectedDate } = useSelectDateFmc()
    const { data, isLoading, isFetching } = useGetLineInService({ date: selectedDate?.toDateString() })

    return (
        <div>
            <PageBreadcrumb pageTitle="FMC Line In Service" />
            <div className="overflow-hidden min-h-screen rounded-2xl border border-gray-200 bg-white px-5 py-7 dark:border-gray-800 dark:bg-white/[0.03] space-y-8">
                <Filter />
                <DataTable isLoading={isLoading || isFetching} data={data} title='Revenue' date={selectedDate} />
                <DataTableARPU isLoading={isLoading || isFetching} data={data} title='ARPU' />
            </div>
        </div>
    )
}
export default LineInServicePage