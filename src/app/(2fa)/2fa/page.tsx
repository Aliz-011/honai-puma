import Link from "next/link";
import { redirect } from "next/navigation";

import { globalGETRateLimit } from "@/lib/request";
import { getCurrentSession } from "@/lib/sessions";
import { TwoFactorVerificationForm } from "./two-factor-verification-form";

const TwoFAPage = async () => {
    if (!globalGETRateLimit()) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <p className="text-red-500">
                    Too many requests. Please try again later.
                </p>
            </div>
        );
    }

    const { session, user } = await getCurrentSession();
    if (session === null) {
        redirect('/signin');
    }
    console.log(session);
    console.log(user);

    if (!user.registered2FA) {
        redirect('/2fa/setup');
    }
    if (session.twoFactorVerified) {
        redirect('/');
    }

    return (
        <div className="mx-auto max-w-md w-full">
            <div className="flex flex-row md:flex-col items-center justify-center gap-4 md:gap-8 w-full">
                <h1 className="text-2xl font-bold">Two-factor authentication</h1>
                <p className="text-sm">Enter the code from your authenticator app.</p>
                <TwoFactorVerificationForm />
                <Link href="/2fa/reset" className="hover:underline text-sm">
                    Use recovery code
                </Link>
            </div>
        </div>
    )
}
export default TwoFAPage