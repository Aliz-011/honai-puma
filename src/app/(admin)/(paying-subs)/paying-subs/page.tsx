'use client'

import PageBreadcrumb from "@/components/common/PageBreadCrumb";
import { TableData } from "@/components/data-table";
import { Filters } from "@/components/filters";

import { useSelectDate } from "@/hooks/use-select-date";
import { useGetPayingSubs } from "@/modules/paying-subs/hooks/use-get-paying-subs";

const PayingSubsPage = () => {
    const { date: selectedDate } = useSelectDate()
    const { data: revenues, isLoading: isLoadingRevenue, refetch, isRefetching } = useGetPayingSubs({ date: selectedDate })

    return (
        <div>
            <PageBreadcrumb pageTitle="Paying Subs" />
            <div className="overflow-hidden min-h-screen rounded-2xl border border-gray-200 bg-white px-5 py-7 dark:border-gray-800 dark:bg-white/[0.03] space-y-4">
                <Filters daysBehind={3} />
                <TableData data={revenues} latestUpdatedData={3} selectedDate={selectedDate} isLoading={isLoadingRevenue || isRefetching} title="Paying Subs" refetch={refetch} />
            </div>
        </div>
    )
}

export default PayingSubsPage