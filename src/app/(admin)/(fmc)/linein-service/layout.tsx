import { Metadata } from "next"
import { getCurrentSession } from "@/lib/sessions"
import { redirect } from "next/navigation"
import LineInServicePage from "./page"

export const metadata: Metadata = {
    title: 'FMC Line in Service | Honai PUMA',
    description: 'FMC Line In Service region PUMA 2025'
}

const LayoutFMC = async () => {

    const { session } = await getCurrentSession();

    if (session === null) {
        redirect('/signin');
    }

    return (
        <LineInServicePage />
    )
}
export default LayoutFMC