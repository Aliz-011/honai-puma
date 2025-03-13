import { Metadata } from "next";

import RevenueSAPage from "./page"

export const metadata: Metadata = {
    title: "Revenue SA 2025 | Honai PUMA",
    description: "Target Revenue SA 2025 Telkomsel untuk area PUMA",
};

const RevenueSALayout = () => {
    return (
        <RevenueSAPage />
    )
}
export default RevenueSALayout