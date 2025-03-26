import { client } from "@/lib/client"
import { useMutation, useQueryClient } from "@tanstack/react-query"
import { InferRequestType, InferResponseType } from "hono"
import { HTTPException } from "hono/http-exception"
import { useRouter } from "next/navigation"
import { toast } from "sonner"

type ResponseType = InferResponseType<typeof client.api.auth['2fa-setup']['$post']>
type RequestType = InferRequestType<typeof client.api.auth['2fa-setup']['$post']>['json']

export const useTwoFactorSetup = () => {
    const queryClient = useQueryClient()
    const router = useRouter()

    const mutate = useMutation<ResponseType, HTTPException, RequestType>({
        mutationFn: async (json) => {
            const response = await client.api.auth['2fa-setup']['$post']({ json })

            return await response.json()
        },
        onSuccess: (data) => {
            router.push('/2fa')
            toast.success('2FA has been implemented')
            queryClient.invalidateQueries({ queryKey: ['2fa'] })
        },
        onError: (error) => {
            toast.error(error.message)
        }
    })

    return mutate
}