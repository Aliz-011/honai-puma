'use client'

import PageBreadcrumb from "@/components/common/PageBreadCrumb";
import { TableData } from "@/components/data-table";
import { Filters } from "@/components/filters";

import { useSelectDate } from "@/hooks/use-select-date";
import { useGetRedeemPV } from "@/modules/redeem-pv/hooks/use-get-redeem-pv";

const RevenueRedeemPVPage = () => {
    const { date } = useSelectDate()
    const { data, isLoading, isRefetching, refetch } = useGetRedeemPV({ date })

    return (
        <div>
            <PageBreadcrumb pageTitle="Revenue Redeem PV Prabayar" />
            <div className="overflow-hidden min-h-screen rounded-2xl border border-gray-200 bg-white px-5 py-7 dark:border-gray-800 dark:bg-white/[0.03] space-y-4">
                <Filters daysBehind={3} />
                <TableData data={data} selectedDate={date} latestUpdatedData={3} title="Revenue Redeem PV Prabayar" isLoading={isLoading || isRefetching} refetch={refetch} />
            </div>
        </div>
    )
}

export default RevenueRedeemPVPage