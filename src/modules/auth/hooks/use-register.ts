import { client } from "@/lib/client"
import { useMutation, useQueryClient } from "@tanstack/react-query"
import { InferRequestType, InferResponseType } from "hono"
import { HTTPResponseError } from "hono/types"
import { toast } from "sonner"

type ResponseType = InferResponseType<typeof client.api.auth.register.$post>
type RequestType = InferRequestType<typeof client.api.auth.register.$post>['json']

export const useRegister = () => {
    const queryClient = useQueryClient()

    const mutate = useMutation<ResponseType, HTTPResponseError, RequestType>({
        mutationFn: async json => {
            const response = await client.api.auth.register.$post({ json })

            return await response.json()
        },
        onSuccess: (data) => {
            queryClient.invalidateQueries({ queryKey: ['current'] })
            toast.success('Account created')
        },
        onError: (error) => {
            toast.error('Something went wrong')
        }
    })

    return mutate
}