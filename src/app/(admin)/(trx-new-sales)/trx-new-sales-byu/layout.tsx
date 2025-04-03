import { Metadata } from "next";
import TrxNewSalesPrabayarPage from "./page";   // import your Demo's page
import { redirect } from "next/navigation";
import { getCurrentSession } from "@/lib/sessions";

export const metadata: Metadata = {
    title: "Trx New Sales ByU 2025 | Honai PUMA",
    description: "Target Trx New Sales ByU 2025 Telkomsel untuk area PUMA",
};

export default async function PageLayout() {
    const { session, user } = await getCurrentSession();

    if (session === null) {
        redirect('/signin');
    }
    return (<TrxNewSalesPrabayarPage />)
};