import { client } from "@/lib/client"
import { useQuery } from "@tanstack/react-query"

type QueryParams = { date?: Date; kabupaten?: string; cluster?: string; subbranch?: string; branch?: string; }

export const useGetRevenueSA = ({ branch, subbranch, cluster, kabupaten, date }: QueryParams) => {
    const query = useQuery({
        queryKey: ['revenue-sa', { date }],
        queryFn: async () => {
            const response = await client.api["revenue-sa"].$get({ query: { date: date?.toDateString() } })

            if (!response.ok) {
                throw new Error('Failed to fetch Revenue SA')
            }

            const { data } = await response.json()

            return data
        }
    })

    return query
}