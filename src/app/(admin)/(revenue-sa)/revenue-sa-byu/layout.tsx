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
    return (
        <RevenueSAByUPage />
    )
}
export default RevenueSAByULayout