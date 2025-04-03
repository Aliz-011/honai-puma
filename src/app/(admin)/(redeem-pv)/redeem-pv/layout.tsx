import { Metadata } from "next";

import RevenueRedeemPVPage from "./page"
import { getCurrentSession } from "@/lib/sessions";
import { redirect } from "next/navigation";

export const metadata: Metadata = {
    title: "Revenue Redeem PV Prabayar 2025 | Honai PUMA",
    description: "Target Revenue Redeem PV Prabayar 2025 Telkomsel untuk area PUMA",
};

const RedeemPVLayout = async () => {
    const { session, user } = await getCurrentSession();

    if (session === null) {
        redirect('/signin');
    }
    return (
        <RevenueRedeemPVPage />
    )
}
export default RedeemPVLayout