import { useQuery } from "@tanstack/react-query";

import { client } from "@/lib/client";

type QueryParams = { date?: Date; kabupaten?: string; cluster?: string; subbranch?: string; branch?: string; }

export const useGetRevenueByu = ({ date, kabupaten, branch, cluster, subbranch }: QueryParams) => {
    const query = useQuery({
        queryKey: ["revenue-byu", { date, kabupaten, branch, subbranch, cluster }],
        queryFn: async () => {
            const response = await client.api["revenue-byu"].$get({ query: { date: date?.toDateString(), branch, cluster, subbranch, kabupaten } });

            if (!response.ok) {
                throw new Error("Failed to fetch Revenue ByU");
            }

            const { data } = await response.json();

            return data
        },
        gcTime: 60 * 1000 * 10, // 10 Minutes
        staleTime: 12 * 60 * 1000 * 60 // 12 Hours
    });

    return query;
};
