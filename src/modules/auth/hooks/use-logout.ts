import { useMutation, useQueryClient } from "@tanstack/react-query"
import { useRouter } from "next/navigation"
import { toast } from "sonner"

import { client } from "@/lib/client"

export const useLogout = () => {
    const queryClient = useQueryClient()
    const router = useRouter()

    const mutate = useMutation({
        mutationFn: async () => {
            const response = await client.api.auth.logout.$post()

            return await response.json()
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['current'] })
            router.refresh()
            toast.success('Logged out')
        },
        onError: () => {
            toast.error('Something went wrong')
        }
    })

    return mutate
}