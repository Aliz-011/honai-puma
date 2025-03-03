import { Metadata } from "next";

import PageBreadcrumb from "@/components/common/PageBreadCrumb";
import { Filters } from "@/components/filters";
import { TableData } from "./table-data";

export const metadata: Metadata = {
  title: "Revenue Gross Prabayar 2025 | Honai PUMA",
  description: "Target Revenue Gross 2025 Telkomsel untuk area PUMA",
};

const RevenueGrossPage = () => {
  return (
    <div>
      <PageBreadcrumb pageTitle="Revenue Gross Prabayar" />
      <div className="overflow-hidden min-h-screen rounded-2xl border border-gray-200 bg-white px-5 py-7 dark:border-gray-800 dark:bg-white/[0.03] space-y-8">
        <Filters />

        <TableData />
      </div>
    </div>
  )
}

export default RevenueGrossPage