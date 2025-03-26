'use client'

import Input from "@/components/form/input/InputField"
import Button from "@/components/ui/button/Button"
import { useTwoFactorSetup } from "@/modules/auth/hooks/use-two-factor-setup"
import { FormEvent, useState } from "react"

export const TwoFactorSetupForm = ({ encodedTOTPKey }: { encodedTOTPKey: string }) => {
    const [code, setCode] = useState('')

    const { mutate, isPending } = useTwoFactorSetup()

    function onSubmit(e: FormEvent<HTMLFormElement>) {
        e.preventDefault()
        mutate({ code, key: encodedTOTPKey }, {
            onSuccess: () => {
                setCode('')
            }
        })
    }

    return (
        <form onSubmit={onSubmit}>
            <input type="hidden" value={encodedTOTPKey} required />
            <div className="grid w-full max-w-sm gap-1.5">
                <Input value={code} onChange={(e) => setCode(e.target.value)} placeholder="XXXXXX" disabled={isPending} />
                <div className="text-center text-sm dark:text-white">Verify the code from the app</div>
            </div>
            <div className="w-full">
                <Button size="sm" className="w-full my-4" disabled={isPending}>Save</Button>
            </div>
        </form>
    )
}