import PageBreadcrumb from "@/components/common/PageBreadCrumb"
import { Metadata } from "next"
import { Filter } from "../filter"

export const metadata: Metadata = {
    title: 'FMC Line in Service | Honai PUMA',
    description: 'FMC Line In Service region PUMA 2025'
}

const LineInServicePage = () => {
    return (
        <div>
            <PageBreadcrumb pageTitle="FMC Line In Service" />
            <div className="overflow-hidden min-h-screen rounded-2xl border border-gray-200 bg-white px-5 py-7 dark:border-gray-800 dark:bg-white/[0.03] space-y-4">
                <Filter />
            </div>
        </div>
    )
}
export default LineInServicePage