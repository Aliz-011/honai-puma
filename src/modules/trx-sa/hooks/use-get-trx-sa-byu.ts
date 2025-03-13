import { client } from "@/lib/client"
import { QueryClient, useQuery } from "@tanstack/react-query"

type QueryParams = { date?: Date }

export const useGetTrxSAByu = ({ date }: QueryParams) => {
    const queryClient = new QueryClient()

    const query = useQuery({
        queryKey: ['trx-sa-byu', { date }],
        queryFn: async ({ signal }) => {
            const response = await client.api["trx-sa"]['trx-sa-byu'].$get({ query: { date: date?.toDateString() } }, { init: { signal } })

            if (!response.ok) {
                throw new Error('Failed to fetch Trx SA ByU')
            }

            const { data } = await response.json()

            return data
        },
        gcTime: 60 * 1000 * 10, // 10 Minutes
        staleTime: 12 * 60 * 1000 * 60, // 12 Hours
        retry: 2,
        placeholderData: () => {
            return queryClient
                .getQueryData(['trx-sa-byu', { date }])
        }
    })

    return query
}