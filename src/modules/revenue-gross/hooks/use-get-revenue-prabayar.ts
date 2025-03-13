import { QueryClient, useQuery } from "@tanstack/react-query";

import { client } from "@/lib/client";

type QueryParams = { date?: Date; }

export const useGetRevenueGrossPrabayar = ({ date }: QueryParams) => {
    const queryClient = new QueryClient()

    const query = useQuery({
        queryKey: ["revenue-gross-prabayar", { date }],
        queryFn: async ({ signal }) => {
            const response = await client.api["revenue-grosses"]["revenue-gross-prabayar"].$get({ query: { date: date?.toDateString() } }, { init: { signal } });

            if (!response.ok) {
                throw new Error("Failed to fetch revenue gross");
            }

            const { data } = await response.json();

            return data
        },
        gcTime: 1000 * 60 * 60 * 24,
        staleTime: 1000 * 60 * 60 * 12,
        retry: 2,
        placeholderData: () => {
            return queryClient
                .getQueryData(['revenue-gross-prabayar', { date }])
        }
    });

    return query;
};
