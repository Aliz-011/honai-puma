import { Metadata } from "next";

import RevenueNewSalesPage from "./page"
import { getCurrentSession } from "@/lib/sessions";
import { redirect } from "next/navigation";

export const metadata: Metadata = {
    title: "Revenue New Sales 2025 | Honai PUMA",
    description: "Target Revenue ByU 2025 Telkomsel untuk area PUMA",
};

const RevenueNewSalesLayout = async () => {
    const { session, user } = await getCurrentSession();

    if (session === null) {
        redirect('/signin');
    }

    return (
        <RevenueNewSalesPage />
    )
}
export default RevenueNewSalesLayout