import { client } from "@/lib/client"
import { useQuery } from "@tanstack/react-query"

type QueryParams = { date?: Date }

export const useGetTargetSO = ({ date }: QueryParams) => {
    const query = useQuery({
        queryKey: ['target-so', { date }],
        queryFn: async () => {
            const response = await client.api["target-so"].$get({ query: { date: date?.toDateString() } })

            if (!response.ok) {
                throw new Error('Failed to fetch Target SO')
            }

            const { data } = await response.json()

            return data
        },
        retry: 2,
    })

    return query
}