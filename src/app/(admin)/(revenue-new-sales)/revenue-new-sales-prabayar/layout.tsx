import { Metadata } from "next";
import RevenueNewSalesPrabayarPage from "./page";
import { redirect } from "next/navigation";
import { getCurrentSession } from "@/lib/sessions";

export const metadata: Metadata = {
    title: "Revenue New Sales 2025 | Honai PUMA",
    description: "Target Revenue ByU 2025 Telkomsel untuk area PUMA",
};

const RevenueNewSalesLayout = async () => {
    const { session, user } = await getCurrentSession();

    if (session === null) {
        redirect('/signin');
    }
    if (!user.emailVerified) {
        redirect('/verify-email');
    }
    if (!user.registered2FA) {
        redirect('/2fa/setup');
    }
    if (!session.twoFactorVerified) {
        redirect('/2fa');
    }
    return (
        <RevenueNewSalesPrabayarPage />
    )
}
export default RevenueNewSalesLayout