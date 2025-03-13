'use client'

import DatePicker from 'react-datepicker'

import "react-datepicker/dist/react-datepicker.css";

import Label from "@/components/form/Label";
import Select from "@/components/form/Select";
import { useSelectBranch } from "@/hooks/use-select-branch"
import { useSelectCluster } from "@/hooks/use-select-cluster"
import { useSelectKabupaten } from "@/hooks/use-select-kabupaten"
import { useSelectSubbranch } from "@/hooks/use-select-subbranch"
import { useSelectRegion } from "@/hooks/use-select-region";
import { useGetAreas } from "@/modules/areas/hooks/use-get-areas";
import { Skeleton } from "./common/skeleton";
import { useSelectDate } from "@/hooks/use-select-date";
import { subDays } from 'date-fns';

export const TestFilter = ({ daysBehind }: { daysBehind: number }) => {
    const { data: areas, isLoading: isLoadingRegion } = useGetAreas()
    const { date: selectedDate, setDate: setSelectedDate } = useSelectDate()
    const { region: selectedRegion, setSelectedRegion } = useSelectRegion()
    const { branch: selectedBranch, setSelectedBranch } = useSelectBranch()
    const { subbranch: selectedSubbranch, setSelectedSubbranch } = useSelectSubbranch()
    const { cluster: selectedCluster, setSelectedCluster } = useSelectCluster()
    const { setSelectedKabupaten } = useSelectKabupaten()

    const handleRegionChange = (value: string) => {
        setSelectedRegion(value);
        setSelectedBranch("");
        setSelectedSubbranch("");
        setSelectedCluster("");
        setSelectedKabupaten("");
    };

    const handleBranchChange = (value: string) => {
        setSelectedBranch(value);
        setSelectedSubbranch("");
        setSelectedCluster("");
        setSelectedKabupaten("");
    };

    const handleSubbranchChange = (value: string) => {
        setSelectedSubbranch(value);
        setSelectedCluster("");
        setSelectedKabupaten("");
    };

    const handleClusterChange = (value: string) => {
        setSelectedCluster(value);
        setSelectedKabupaten("");
    };

    const handleDateChange = (date: Date | null) => {
        console.log(date);

        setSelectedDate(new Date(date!));
    }

    if (isLoadingRegion || !areas) {
        return (
            <div className='grid grid-cols-3 sm:grid-cols- md:grid-cols-4 lg:grid-cols-4 gap-4'>
                {[1, 2, 3, 4].map((_, index) => (
                    <div className='space-y-2' key={index}>
                        <Skeleton className='h-4 w-10' />
                        <Skeleton className='h-8 w-48' />
                    </div>
                ))}
            </div>
        )
    }

    const regionalOptions = areas.map(area => ({
        label: area.regional,
        value: area.regional
    }))

    const getFilteredBranches = () => {
        const area = areas.find((a) => a.regional === selectedRegion)
        return area?.branches.map(area => ({ label: area.branchNew, value: area.branchNew })) || [];
    };

    const getFilteredSubbranches = () => {
        const area = areas.find((a) => a.regional === selectedRegion);
        const branch = area?.branches.find((b) => b.branchNew === selectedBranch);
        return branch?.subbranches.map(area => ({ label: area.subbranchNew, value: area.subbranchNew })) || [];
    };

    const getFilteredClusters = () => {
        const area = areas.find((a) => a.regional === selectedRegion);
        const branch = area?.branches.find((b) => b.branchNew === selectedBranch);
        const subbranch = branch?.subbranches.find(
            (s) => s.subbranchNew === selectedSubbranch
        );
        return subbranch?.clusters.map(area => ({ label: area.cluster, value: area.cluster })) || [];
    };

    const getFilteredKabupatens = () => {
        const area = areas.find((a) => a.regional === selectedRegion);
        const branch = area?.branches.find((b) => b.branchNew === selectedBranch);
        const subbranch = branch?.subbranches.find(
            (s) => s.subbranchNew === selectedSubbranch
        );
        const cluster = subbranch?.clusters.find(
            (c) => c.cluster === selectedCluster
        );
        return cluster?.kabupatens.map(area => ({ label: area.kabupaten, value: area.kabupaten })) || [];
    };

    const renderMonthContent = (
        month: number,
        shortMonth: string,
        longMonth: string,
        day: Date
    ) => {
        const fullYear = new Date(day).getFullYear();
        const tooltipText = `Tooltip for month: ${longMonth} ${fullYear}`;

        return <span title={tooltipText}>{shortMonth}</span>;
    };

    return (
        <div className='grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 lg:grid-cols-4 gap-4 items-center'>
            <div>
                <Label>Tanggal</Label>
                <DatePicker
                    selected={selectedDate}
                    renderMonthContent={renderMonthContent}
                    onChange={(date) => handleDateChange(date)}
                    dateFormat="yyyy-MM-dd"
                    maxDate={subDays(new Date(), daysBehind)}
                    className="w-full text-gray-700 bg-white border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    calendarClassName="shadow-lg border-0"
                    customInput={
                        <input className="w-full h-8 px-2 py-1.5 text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent cursor-pointer" />
                    }
                    wrapperClassName="w-full"
                    showPopperArrow={false}
                    dayClassName={(date) =>
                        date.getDate() === selectedDate?.getDate() &&
                            date.getMonth() === selectedDate?.getMonth()
                            ? "bg-blue-500 text-white rounded-full p-1 hover:bg-blue-600"
                            : "hover:bg-gray-100 rounded-full p-1"
                    }
                />
            </div>
            <div>
                <Label>Regional</Label>
                <Select
                    defaultValue={regionalOptions[0].value}
                    options={regionalOptions}
                    onChange={handleRegionChange}
                    className="dark:bg-dark-900 h-8 py-1.5 px-2 text-theme-sm"
                    placeholder='Select Regional'
                />
            </div>
            <div>
                <Label>Branch</Label>
                <Select
                    disabled={!selectedRegion}
                    options={getFilteredBranches()}
                    placeholder="Select Branch"
                    onChange={handleBranchChange}
                    className="dark:bg-dark-900 h-8 py-1.5 px-2 text-theme-sm"
                />
            </div>
            <div>
                <Label>Subbranch</Label>
                <Select
                    disabled={!selectedBranch}
                    options={getFilteredSubbranches()}
                    placeholder="Select Subbranch"
                    onChange={handleSubbranchChange}
                    className="dark:bg-dark-900 h-8 py-1.5 px-2 text-theme-sm"
                />
            </div>
            <div>
                <Label>Cluster</Label>
                <Select
                    disabled={!selectedSubbranch}
                    options={getFilteredClusters()}
                    placeholder="Select Cluster"
                    onChange={handleClusterChange}
                    className="dark:bg-dark-900 h-8 py-1.5 px-2 text-theme-sm"
                />
            </div>
            <div>
                <Label>Kabupaten</Label>
                <Select
                    disabled={!selectedCluster}
                    options={getFilteredKabupatens()}
                    placeholder="Select Kabupaten"
                    onChange={setSelectedKabupaten}
                    className="dark:bg-dark-900 h-8 py-1.5 px-2 text-theme-sm"
                />
            </div>
        </div>
    )
}