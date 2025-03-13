import { client } from "@/lib/client"
import { useQuery } from "@tanstack/react-query"

type QueryParams = { date?: Date }

export const useGetTrxSAByu = ({ date }: QueryParams) => {
    const query = useQuery({
        queryKey: ['trx-sa-byu', { date }],
        queryFn: async () => {
            const response = await client.api["trx-sa"]['trx-sa-byu'].$get({ query: { date: date?.toDateString() } })

            if (!response.ok) {
                throw new Error('Failed to fetch Trx SA ByU')
            }

            const { data } = await response.json()

            return data
        }
    })

    return query
}