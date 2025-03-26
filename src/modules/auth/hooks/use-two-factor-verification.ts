import { client } from "@/lib/client"
import { useMutation, useQueryClient } from "@tanstack/react-query"
import { InferRequestType, InferResponseType } from "hono"
import { HTTPException } from "hono/http-exception"
import { toast } from "sonner"

type ResponseType = InferResponseType<typeof client.api.auth['2fa']['$post']>
type RequestType = InferRequestType<typeof client.api.auth['2fa']['$post']>['json']
export const useTwoFactorVerification = () => {
    const queryClient = useQueryClient()

    const mutate = useMutation<ResponseType, HTTPException, RequestType>({
        mutationFn: async (json) => {
            const response = await client.api.auth["2fa"]['$post']({ json })

            return await response.json()
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['2fa'] })
            toast.success('Success! Redirecting...')
        },
        onError: (error) => {
            toast.error(error.message)
        }
    })

    return mutate
}