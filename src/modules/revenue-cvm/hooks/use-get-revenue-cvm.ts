import { client } from "@/lib/client"
import { useQuery } from "@tanstack/react-query"

type QueryParams = { date?: Date; kabupaten?: string; cluster?: string; subbranch?: string; branch?: string; }

export const useGetRevenueCVM = ({ branch, subbranch, cluster, kabupaten, date }: QueryParams) => {
    const query = useQuery({
        queryKey: ['revenue-cvm', { date, branch, subbranch, cluster, kabupaten }],
        queryFn: async () => {
            const response = await client.api["revenue-cvm"].$get({ query: { date: date?.toDateString(), branch, subbranch, cluster, kabupaten } })

            if (!response.ok) {
                throw new Error('Failed to fetch Revenue CVM')
            }

            const { data } = await response.json()

            return data
        },
        gcTime: 60 * 1000 * 10, // 10 Minutes
        staleTime: 12 * 60 * 1000 * 60 // 12 Hours
    })

    return query
}