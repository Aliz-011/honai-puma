import { client } from "@/lib/client"
import { useQuery } from "@tanstack/react-query"

type QueryParams = { date?: Date }

export const useGetTrxSA = ({ date }: QueryParams) => {
    const query = useQuery({
        queryKey: ['trx-sa', { date }],
        queryFn: async () => {
            const response = await client.api["trx-sa"].$get({ query: { date: date?.toDateString() } })

            if (!response.ok) {
                throw new Error('Failed to fetch Trx SA')
            }

            const { data } = await response.json()

            return data
        }
    })

    return query
}