'use client'

import PageBreadcrumb from "@/components/common/PageBreadCrumb";
import { TableData } from "@/components/data-table";
import { Filters } from "@/components/filters";

import { useSelectDate } from "@/hooks/use-select-date";
import { useGetTargetSO } from "@/modules/target-so/hooks/use-get-target-so";

const TargetSOPage = () => {
    const { date: selectedDate } = useSelectDate()
    const { data: revenues, isLoading, refetch } = useGetTargetSO({ date: selectedDate })

    return (
        <div>
            <PageBreadcrumb pageTitle="Target SO All" />
            <div className="overflow-hidden min-h-screen rounded-2xl border border-gray-200 bg-white px-5 py-7 dark:border-gray-800 dark:bg-white/[0.03] space-y-4">
                <Filters daysBehind={3} />
                <TableData data={revenues} title="Target SO All" refetch={refetch} latestUpdatedData={3} selectedDate={selectedDate} isLoading={isLoading} />
            </div>
        </div>
    )
}

export default TargetSOPage