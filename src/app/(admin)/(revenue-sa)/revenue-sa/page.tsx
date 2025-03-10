import { Metadata } from "next";

import PageBreadcrumb from "@/components/common/PageBreadCrumb";
import { Filters } from "@/components/filters";
import { TableData } from "./table-data";

export const metadata: Metadata = {
    title: "Revenue SA 2025 | Honai PUMA",
    description: "Target Revenue SA 2025 Telkomsel untuk area PUMA",
};

const RevenueSAPage = () => {
    return (
        <div>
            <PageBreadcrumb pageTitle="Revenue SA" />
            <div className="overflow-hidden min-h-screen rounded-2xl border border-gray-200 bg-white px-5 py-7 dark:border-gray-800 dark:bg-white/[0.03] space-y-4">
                <Filters />
                <TableData />
            </div>
        </div>
    )
}

export default RevenueSAPage