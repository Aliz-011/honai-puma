import { client } from "@/lib/client"
import { useQuery } from "@tanstack/react-query"

export const useGetFMCAreas = () => {
    const query = useQuery({
        queryKey: ['fmc-areas'],
        queryFn: async () => {
            const response = await client.api.areas['fmc-areas'].$get()

            if (!response.ok) {
                throw new Error('Failed to fetch FMC Area.')
            }

            return await response.json()
        },
        staleTime: 30 * 24 * 60 * 1000 * 60,
        refetchOnWindowFocus: false
    })

    return query
}