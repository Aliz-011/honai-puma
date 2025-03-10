import { client } from "@/lib/client"
import { useQuery } from "@tanstack/react-query"

type QueryParams = { date?: Date }

export const useGetTrxNewSales = ({ date }: QueryParams) => {
    const query = useQuery({
        queryKey: ['trx-new-sales', { date }],
        queryFn: async () => {
            const response = await client.api["trx-new-sales"].$get({ query: { date: date?.toDateString() } })

            if (!response.ok) {
                throw new Error('Failed to fetch Trx New Sales')
            }

            const { data } = await response.json()

            return data
        }
    })

    return query
}