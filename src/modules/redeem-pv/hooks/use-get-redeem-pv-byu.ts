import { QueryClient, useQuery } from "@tanstack/react-query"

import { client } from "@/lib/client"

type QueryParams = { date?: Date }

export const useGetRedeemPVByu = ({ date }: QueryParams) => {
    const queryClient = new QueryClient()

    const query = useQuery({
        queryKey: ['redeem-pv-byu', { date }],
        queryFn: async ({ signal }) => {
            const response = await client.api["redeem-pv"]['redeem-pv-byu'].$get({ query: { date: date?.toDateString() } }, { init: { signal } })

            if (!response.ok) {
                throw new Error('Failed to fetch Revenue Redeem PV Prabayar')
            }

            const { data } = await response.json()

            return data
        },
        gcTime: 60 * 1000 * 10, // 10 Minutes
        staleTime: 12 * 60 * 1000 * 60, // 12 Hours
        retry: 2,
        placeholderData: () => {
            return queryClient
                .getQueryData(['redeem-pv-prabayar', { date }])
        }
    })

    return query
}