import { useQuery } from "@tanstack/react-query"

import { client } from "@/lib/client"

type QueryParams = { date?: Date; }

export const useGetNewSales = ({ date }: QueryParams) => {
    const query = useQuery({
        queryKey: ['revenue-new-sales', { date }],
        queryFn: async () => {
            const response = await client.api["revenue-new-sales"].$get({ query: { date: date?.toDateString() } })

            if (!response.ok) {
                throw new Error('Failed to fetch Revenue New Sales')
            }

            const { data } = await response.json()

            return data
        },
        gcTime: 60 * 1000 * 10, // 10 Minutes
        staleTime: 12 * 60 * 1000 * 60 // 12 Hours
    })

    return query
}