import { useQuery, useQueryClient } from "@tanstack/react-query"
import { InferRequestType } from "hono"

import { client } from "@/lib/client"

type RequestType = InferRequestType<typeof client.api['linein-service']['$get']>['query']

export const useGetLineInService = ({ date }: RequestType) => {
    const queryClient = useQueryClient()
    const query = useQuery({
        queryKey: ['line-in-service', date],
        queryFn: async ({ signal }) => {
            const response = await client.api["linein-service"].$get({ query: { date } }, { init: { signal } })

            if (!response.ok) {
                throw new Error('Failed to fetch line in service data.')
            }

            const { data } = await response.json()

            return data
        },
        gcTime: 1000 * 60 * 60 * 24,
        staleTime: 1000 * 60 * 60 * 12,
        retry: 2,
        placeholderData: () => {
            return queryClient
                .getQueryData(['line-in-service', { date }])
        }
    })

    return query
}