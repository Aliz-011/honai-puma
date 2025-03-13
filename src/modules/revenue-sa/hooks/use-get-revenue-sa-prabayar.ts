import { client } from "@/lib/client"
import { useQuery } from "@tanstack/react-query"

type QueryParams = { date?: Date }

export const useGetRevenueSAPrabayar = ({ date }: QueryParams) => {
    const query = useQuery({
        queryKey: ['revenue-sa-prabayar', { date }],
        queryFn: async () => {
            const response = await client.api["revenue-sa"]['revenue-sa-prabayar'].$get({ query: { date: date?.toDateString() } })

            if (!response.ok) {
                throw new Error('Failed to fetch Revenue SA')
            }

            const { data } = await response.json()

            return data
        },
        retry: 2
    })

    return query
}