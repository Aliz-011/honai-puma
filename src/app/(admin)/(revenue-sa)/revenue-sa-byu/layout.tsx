import { Metadata } from "next";

import RevenueSAByUPage from "./page";
import { getCurrentSession } from "@/lib/sessions";
import { redirect } from "next/navigation";

export const metadata: Metadata = {
    title: "Revenue SA ByU 2025 | Honai PUMA",
    description: "Target Revenue SA 2025 Telkomsel untuk area PUMA",
};

const RevenueSAByULayout = async () => {
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
        <RevenueSAByUPage />
    )
}
export default RevenueSAByULayout