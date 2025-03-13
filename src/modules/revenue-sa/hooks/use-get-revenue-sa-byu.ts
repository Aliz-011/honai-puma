import { client } from "@/lib/client"
import { QueryClient, useQuery } from "@tanstack/react-query"

type QueryParams = { date?: Date }

export const useGetRevenueSAByu = ({ date }: QueryParams) => {
    const queryClient = new QueryClient()

    const query = useQuery({
        queryKey: ['revenue-sa-byu', { date }],
        queryFn: async () => {
            const response = await client.api["revenue-sa"]['revenue-sa-byu'].$get({ query: { date: date?.toDateString() } })

            if (!response.ok) {
                throw new Error('Failed to fetch Revenue SA')
            }

            const { data } = await response.json()

            return data
        },
        gcTime: 60 * 1000 * 10, // 10 Minutes
        staleTime: 12 * 60 * 1000 * 60, // 12 Hours
        retry: 2,
        placeholderData: () => {
            return queryClient
                .getQueryData(['revenue-sa-byu', { date }])
        }
    })

    return query
}