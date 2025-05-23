import { Metadata } from "next";
import TrxSAPage from "./page";
import { redirect } from "next/navigation";
import { getCurrentSession } from "@/lib/sessions";

export const metadata: Metadata = {
    title: "Trx SA 2025 | Honai PUMA",
    description: "Target Trx SA 2025 Telkomsel untuk area PUMA",
};

const TrxSALayout = async () => {
    const { session, user } = await getCurrentSession();

    if (session === null) {
        redirect('/signin');
    }

    return (
        <TrxSAPage />
    )
}
export default TrxSALayout