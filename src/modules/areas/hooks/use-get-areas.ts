import { client } from "@/lib/client";
import { useQuery } from "@tanstack/react-query";

export const useGetAreas = () => {
    const query = useQuery({
        queryKey: ['areas'],
        queryFn: async () => {
            const response = await client.api.areas.$get()

            if (!response.ok) {
                throw new Error('Failed to fetch areas')
            }

            const data = await response.json()

            return data
        },
        staleTime: 24 * 60 * 1000 * 60, // 24 Hours
    })

    return query
}