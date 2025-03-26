import { Metadata } from "next";
import TrxNewSalesPage from "./page";   // import your Demo's page
import { redirect } from "next/navigation";
import { getCurrentSession } from "@/lib/sessions";

export const metadata: Metadata = {
    title: "Trx New Sales 2025 | Honai PUMA",
    description: "Target Trx New Sales 2025 Telkomsel untuk area PUMA",
};

export default async function PageLayout() {
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

    return (<TrxNewSalesPage />)
};