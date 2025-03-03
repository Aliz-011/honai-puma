import { client } from "@/lib/client"
import { useQuery } from "@tanstack/react-query"

type QueryParams = { date?: Date }

export const useGetRevenueSAByu = ({ date }: QueryParams) => {
    const query = useQuery({
        queryKey: ['revenue-sa-byu', { date }],
        queryFn: async () => {
            const response = await client.api["revenue-sa"]['revenue-sa-byu'].$get({ query: { date: date?.toDateString() } })

            if (!response.ok) {
                throw new Error('Failed to fetch Revenue SA')
            }

            const { data } = await response.json()

            return data
        }
    })

    return query
}