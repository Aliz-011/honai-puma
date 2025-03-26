import { useMutation, useQueryClient } from "@tanstack/react-query"
import { InferRequestType, InferResponseType } from "hono"
import { HTTPResponseError } from "hono/types"
import { useRouter } from "next/navigation"
import { toast } from "sonner"

import { client } from "@/lib/client"

type RequestType = InferRequestType<typeof client.api.auth.login.$post>['json']
type ResponseType = InferResponseType<typeof client.api.auth.login.$post>

export const useLogin = () => {
    const queryClient = useQueryClient()
    const router = useRouter()

    const mutate = useMutation<ResponseType, HTTPResponseError, RequestType>({
        mutationFn: async (json) => {
            const response = await client.api.auth.login.$post({ json })

            return await response.json()
        },
        onSuccess: (data) => {
            if (data.redirectUrl) {
                router.push(data.redirectUrl)
            }

            toast.success('Logged in')
            router.refresh()
            queryClient.invalidateQueries({ queryKey: ['current'] })
        },
        onError: async (error) => {
            const data = await error.getResponse().json()
            toast.error(error.message)
        }
    })

    return mutate
}