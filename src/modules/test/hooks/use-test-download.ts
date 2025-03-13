import { client } from "@/lib/client"
import { useMutation } from "@tanstack/react-query"

type Request = {
    date?: string;
    branch?: string;
    subbranch?: string;
    cluster?: string;
    kabupaten?: string;
}

export const useTestDownload = () => {

    const query = useMutation<Blob, Error, Request>({
        mutationFn: async ({ branch, cluster, date, kabupaten, subbranch }) => {
            const response = await client.api.test.$get({ query: { date: date, branch, subbranch, cluster, kabupaten } })

            if (!response.ok) {
                throw new Error('Failed to download')
            }

            const blob = await response.blob()

            return blob
        }
    })

    return query
}