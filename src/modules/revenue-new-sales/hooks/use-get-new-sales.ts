import { useQuery } from "@tanstack/react-query"

import { client } from "@/lib/client"

type QueryParams = { date?: Date; kabupaten?: string; cluster?: string; subbranch?: string; branch?: string; }

export const useGetNewSales = ({ branch, subbranch, cluster, kabupaten, date }: QueryParams) => {
    const query = useQuery({
        queryKey: ['revenue-new-sales', { date, branch, subbranch, cluster, kabupaten }],
        queryFn: async () => {
            const response = await client.api["revenue-new-sales"].$get({ query: { date: date?.toDateString(), branch, subbranch, cluster, kabupaten } })

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