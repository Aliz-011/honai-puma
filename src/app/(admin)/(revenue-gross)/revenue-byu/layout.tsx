import { Metadata } from "next";
import RevenueByUPage from "./page";
import { redirect } from "next/navigation";
import { getCurrentSession } from "@/lib/sessions";

export const metadata: Metadata = {
    title: "Revenue ByU 2025 | Honai PUMA",
    description: "Target Revenue ByU 2025 Telkomsel untuk area PUMA",
};

const RevenueByULayout = async () => {
    const { session, user } = await getCurrentSession();

    if (session === null) {
        redirect('/signin');
    }
    return (
        <RevenueByUPage />
    )
}
export default RevenueByULayout