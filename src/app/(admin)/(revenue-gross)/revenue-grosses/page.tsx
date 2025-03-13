'use client'

import PageBreadcrumb from "@/components/common/PageBreadCrumb";
import { TableData } from "@/components/data-table";
import { Filters } from "@/components/filters";
import { useSelectDate } from "@/hooks/use-select-date";
import { useGetRevenueGrosses } from "@/modules/revenue-gross/hooks/use-get-revenue-grosses";

const RevenueGrossPage = () => {
  const { date: selectedDate } = useSelectDate()
  const { data: revenues, isLoading: isLoadingRevenue, isRefetching, refetch } = useGetRevenueGrosses({ date: selectedDate })

  return (
    <div>
      <PageBreadcrumb pageTitle="Revenue Gross All" />
      <div className="overflow-hidden min-h-screen rounded-2xl border border-gray-200 bg-white px-5 py-7 dark:border-gray-800 dark:bg-white/[0.03] space-y-4">
        <Filters daysBehind={2} />

        <TableData data={revenues} title="Revenue Gross All" latestUpdatedData={2} refetch={refetch} isLoading={isLoadingRevenue || isRefetching} selectedDate={selectedDate} />
      </div>
    </div>
  )
}

export default RevenueGrossPage