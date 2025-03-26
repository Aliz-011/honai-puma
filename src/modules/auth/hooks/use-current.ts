import { client } from "@/lib/client"
import { useQuery } from "@tanstack/react-query"

export const useCurrentSession = () => {
    const query = useQuery({
        queryKey: ['current'],
        queryFn: async () => {
            const response = await client.api.auth.current.$get()

            if (!response.ok) {
                throw new Error('Failed to get current session')
            }

            const { data } = await response.json()

            return data
        },
    })

    return query
}