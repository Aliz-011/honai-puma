'use client'

import { usePathname, useRouter } from "next/navigation";
import queryString from "query-string";

import PageBreadcrumb from "@/components/common/PageBreadCrumb";
import { TestFilter } from "@/components/test-filter";
import Button from "@/components/ui/button/Button";
import { useSelectBranch } from "@/hooks/use-select-branch";
import { useSelectCluster } from "@/hooks/use-select-cluster";
import { useSelectDate } from "@/hooks/use-select-date";
import { useSelectKabupaten } from "@/hooks/use-select-kabupaten";
import { useSelectSubbranch } from "@/hooks/use-select-subbranch";
import { useTestDownload } from "@/modules/test/hooks/use-test-download";

export default function TestPage() {
    const pathname = usePathname()
    const router = useRouter()

    const { date: selectedDate } = useSelectDate()
    const { branch: selectedBranch } = useSelectBranch()
    const { subbranch: selectedSubbranch } = useSelectSubbranch()
    const { cluster: selectedCluster } = useSelectCluster()
    const { kabupaten } = useSelectKabupaten()
    const { mutate, isPending } = useTestDownload()

    const handleSearch = () => {
        const query = {
            date: selectedDate?.toDateString(),
            branch: selectedBranch,
            subbranch: selectedSubbranch,
            cluster: selectedCluster,
            kabupaten
        }

        const url = queryString.stringifyUrl({
            url: pathname,
            query
        }, { skipEmptyString: true, skipNull: true })

        router.push(url)
        mutate(query, {
            onSuccess: (data) => {
                const url = URL.createObjectURL(data);
                const link = document.createElement('a');
                link.href = url;
                link.setAttribute('download', 'report.xlsx');

                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);

                URL.revokeObjectURL(url);
            },
            onError: (error) => {
                console.error('Download failed:', error);
                // Optionally show error message to user
                alert('Failed to download file');
            }
        })
    }

    return (
        <div>
            <PageBreadcrumb pageTitle="Test Page" />
            <div className="overflow-hidden min-h-screen rounded-2xl border border-gray-200 bg-white px-5 py-7 dark:border-gray-800 dark:bg-white/[0.03] space-y-4">
                <TestFilter daysBehind={3} />

                <Button onClick={handleSearch} disabled={isPending} size="sm">Download</Button>
            </div>
        </div>
    );
}
