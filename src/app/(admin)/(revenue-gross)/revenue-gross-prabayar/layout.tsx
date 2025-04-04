import { Metadata } from "next";
import RevenueGrossPrabayarPage from "./page";
import { redirect } from "next/navigation";
import { getCurrentSession } from "@/lib/sessions";

export const metadata: Metadata = {
    title: "Revenue Gross Prabayar 2025 | Honai PUMA",
    description: "Target Revenue Gross 2025 Telkomsel untuk area PUMA",
};

const RevenueGrossPrabayarLayout = async () => {
    const { session, user } = await getCurrentSession();

    if (session === null) {
        redirect('/signin');
    }
    return (
        <RevenueGrossPrabayarPage />
    )
}
export default RevenueGrossPrabayarLayout