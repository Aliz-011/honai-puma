import { Metadata } from "next";

import PageBreadcrumb from "@/components/common/PageBreadCrumb";
import { Filters } from "@/components/filters";
import { TableData } from "./table-data";

export const metadata: Metadata = {
    title: "Revenue New Sales 2025 | Honai PUMA",
    description: "Target Revenue ByU 2025 Telkomsel untuk area PUMA",
};

const RevenueNewSalesPage = () => {
    return (
        <div>
            <PageBreadcrumb pageTitle="Revenue New Sales Prabayar" />
            <div className="overflow-hidden min-h-screen rounded-2xl border border-gray-200 bg-white px-5 py-7 dark:border-gray-800 dark:bg-white/[0.03] space-y-8">
                <Filters />
                <TableData />
            </div>
        </div>
    )
}

export default RevenueNewSalesPage