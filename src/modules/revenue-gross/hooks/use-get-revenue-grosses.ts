import { useQuery, useQueryClient } from "@tanstack/react-query";

import { client } from "@/lib/client";

type QueryParams = { date?: Date; }

export const useGetRevenueGrosses = ({ date }: QueryParams) => {
	const queryClient = useQueryClient()
	const query = useQuery({
		queryKey: ["revenue-grosses", { date }],
		queryFn: async ({ signal }) => {
			const response = await client.api["revenue-grosses"].$get({ query: { date: date?.toDateString() } }, { init: { signal } });

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
				.getQueryData(['revenue-grosses', { date }])
		}
	});

	return query;
};
