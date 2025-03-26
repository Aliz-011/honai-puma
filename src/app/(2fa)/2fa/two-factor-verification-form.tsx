'use client'

import Input from "@/components/form/input/InputField"
import Button from "@/components/ui/button/Button"
import { useTwoFactorVerification } from "@/modules/auth/hooks/use-two-factor-verification"
import { FormEvent, useState } from "react"

export const TwoFactorVerificationForm = () => {
    const [code, setCode] = useState('')

    const { mutate, isPending } = useTwoFactorVerification()

    function onSubmit(e: FormEvent<HTMLFormElement>) {
        e.preventDefault()

        mutate({ code })
    }

    return (
        <form onSubmit={onSubmit}>
            <div className="grid w-full max-w-sm gap-1.5">
                <Input value={code} onChange={(e) => setCode(e.target.value)} placeholder="XXXXXX" disabled={isPending} />
                <div className="text-center text-sm dark:text-white">Enter your one-time password</div>
            </div>
            <div className="w-full">
                <Button size="sm" className="w-full my-4" disabled={isPending}>Save</Button>
            </div>
        </form>
    )
}