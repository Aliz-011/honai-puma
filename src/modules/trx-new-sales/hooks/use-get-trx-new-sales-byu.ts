import { client } from "@/lib/client"
import { useQuery } from "@tanstack/react-query"

type QueryParams = { date?: Date }

export const useGetTrxNewSalesByu = ({ date }: QueryParams) => {
    const query = useQuery({
        queryKey: ['trx-new-sales-byu', { date }],
        queryFn: async () => {
            const response = await client.api["trx-new-sales"]['trx-new-sales-byu'].$get({ query: { date: date?.toDateString() } })

            if (!response.ok) {
                throw new Error('Failed to fetch Trx New Sales ByU')
            }

            const { data } = await response.json()

            return data
        }
    })

    return query
}