import { useQuery } from "@tanstack/react-query";

import { client } from "@/lib/client";

type QueryParams = { date?: Date; }

export const useGetRevenueGrosses = ({ date }: QueryParams) => {
	const query = useQuery({
		queryKey: ["revenue-grosses", { date }],
		queryFn: async () => {
			const response = await client.api["revenue-grosses"].$get({ query: { date: date?.toDateString() } });

			if (!response.ok) {
				throw new Error("Failed to fetch revenue gross");
			}

			const { data } = await response.json();

			return data
		},
		gcTime: 1000 * 60 * 60 * 24,
		staleTime: 1000 * 60 * 60 * 12,
	});

	return query;
};
