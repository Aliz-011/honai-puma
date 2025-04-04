import { Metadata } from "next";
import RevenueCVMPage from "./page";
import { redirect } from "next/navigation";
import { getCurrentSession } from "@/lib/sessions";

export const metadata: Metadata = {
    title: "Revenue CVM 2025 | Honai PUMA",
    description: "Target Revenue CVM 2025 Telkomsel untuk area PUMA",
};

const RevenueCVMLayout = async () => {
    const { session, user } = await getCurrentSession();

    if (session === null) {
        redirect('/signin');
    }
    return (
        <RevenueCVMPage />
    )
}
export default RevenueCVMLayout