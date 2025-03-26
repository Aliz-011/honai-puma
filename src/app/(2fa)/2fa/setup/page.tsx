import { encodeBase64 } from "@oslojs/encoding";
import { createTOTPKeyURI } from "@oslojs/otp";
import { Metadata } from "next"
import { redirect } from "next/navigation";
import { renderSVG } from 'uqr'

import { globalGETRateLimit } from "@/lib/request";
import { getCurrentSession } from "@/lib/sessions";
import { TwoFactorSetupForm } from "./two-factor-setup-form";

export const metadata: Metadata = {
    title: '2FA Setup | Honai PUMA',
    description: 'Setup your 2FA authentication to secure your account.'
}

const TwoFASetupPage = async () => {
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

    if (user.registered2FA && !session.twoFactorVerified) {
        redirect('/2fa');
    }

    const totpKey = new Uint8Array(20);
    crypto.getRandomValues(totpKey);
    const encodedTOTPKey = encodeBase64(totpKey);
    const keyURI = createTOTPKeyURI('Honai', user.username, totpKey, 30, 6);
    const qrcode = renderSVG(keyURI);


    return (
        <div className="mx-auto max-w-md w-full">
            <div className="flex flex-row md:flex-col items-center justify-center gap-4 md:gap-8">
                <h1 className="text-2xl font-bold dark:text-white">Set up two-factor authentication</h1>
                <div
                    style={{
                        width: '200px',
                        height: '200px',
                    }}
                    dangerouslySetInnerHTML={{
                        __html: qrcode,
                    }}
                ></div>
                <TwoFactorSetupForm encodedTOTPKey={encodedTOTPKey} />
            </div>
        </div>
    )
}
export default TwoFASetupPage