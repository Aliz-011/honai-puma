import { Metadata } from "next";

import RevenueSAPage from "./page"
import { redirect } from "next/navigation";
import { getCurrentSession } from "@/lib/sessions";

export const metadata: Metadata = {
    title: "Revenue SA 2025 | Honai PUMA",
    description: "Target Revenue SA 2025 Telkomsel untuk area PUMA",
};

const RevenueSALayout = async () => {
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
        <RevenueSAPage />
    )
}
export default RevenueSALayout