import { useQuery } from "@tanstack/react-query";

import { client } from "@/lib/client";

type QueryParams = { date?: Date; }

export const useGetPayingSubs = ({ date }: QueryParams) => {
    const query = useQuery({
        queryKey: ["paying-subs", { date }],
        queryFn: async () => {
            const response = await client.api["paying-subs"].$get({ query: { date: date?.toDateString() } });

            if (!response.ok) {
                throw new Error("Failed to fetch Paying Subs");
            }

            const { data } = await response.json();

            return data
        },
        gcTime: 60 * 1000 * 10, // 10 Minutes
        staleTime: 12 * 60 * 1000 * 60, // 12 Hours
        retry: 2
    });

    return query;
};
