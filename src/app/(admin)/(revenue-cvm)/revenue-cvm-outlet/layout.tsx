import { Metadata } from "next"
import RevenueCVMOutletPage from "./page"
import { redirect } from "next/navigation";
import { getCurrentSession } from "@/lib/sessions";

export const metadata: Metadata = {
    title: 'Revenue CVM Outlet | Honai PUMA',
    description: 'This page is for Revenue CVM Outlet PUMA 2025'
}

const RevenueCVMOutletLayout = async () => {
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
        <RevenueCVMOutletPage />
    )
}
export default RevenueCVMOutletLayout