import { useQuery } from "@tanstack/react-query"

import { client } from "@/lib/client"

type QueryParams = { date?: Date }

export const useGetRedeemPVPrabayar = ({ date }: QueryParams) => {
    const query = useQuery({
        queryKey: ['redeem-pv-prabayar', { date }],
        queryFn: async () => {
            const response = await client.api["redeem-pv"]['redeem-pv-prabayar'].$get({ query: { date: date?.toDateString() } })

            if (!response.ok) {
                throw new Error('Failed to fetch Revenue Redeem PV Prabayar')
            }

            const { data } = await response.json()

            return data
        },
        gcTime: 60 * 1000 * 10, // 10 Minutes
        staleTime: 12 * 60 * 1000 * 60, // 12 Hours
        retry: 2
    })

    return query
}