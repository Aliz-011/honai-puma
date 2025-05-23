import { Metadata } from "next";

import TrxSAPrabayarPage from "./page";
import { redirect } from "next/navigation";
import { getCurrentSession } from "@/lib/sessions";

export const metadata: Metadata = {
    title: "Trx SA Prabayar 2025 | Honai PUMA",
    description: "Target Trx SA Prabayar 2025 Telkomsel untuk area PUMA",
};

const PageLayout = async () => {
    const { session, user } = await getCurrentSession();

    if (session === null) {
        redirect('/signin');
    }
    return (
        <TrxSAPrabayarPage />
    )
}
export default PageLayout