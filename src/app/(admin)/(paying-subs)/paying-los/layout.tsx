import { Metadata } from "next";
import PayingLosPage from "./page";   // import your Demo's page

export const metadata: Metadata = {
    title: "Paying LOS 0-1 2025 | Honai PUMA",
    description: "Target Paying LOS 0-1 2025 Telkomsel untuk area PUMA",
};

export default function PageLayout() {
    return (<PayingLosPage />)
};