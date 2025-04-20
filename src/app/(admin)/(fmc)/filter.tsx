'use client'

import DatePicker from 'react-datepicker'
import { getDaysInMonth, subDays, setDate, getYear, getMonth } from 'date-fns';

import "react-datepicker/dist/react-datepicker.css";

import { Skeleton } from "@/components/common/skeleton"
import Label from "@/components/form/Label"
import Select from "@/components/form/Select"
import { useSelectBranch } from "@/hooks/use-select-branch"
import { useSelectRegion } from "@/hooks/use-select-region"
import { useSelectSto } from "@/hooks/use-select-sto"
import { useSelectWok } from "@/hooks/use-select-wok"
import { useGetFMCAreas } from "@/modules/areas/hooks/use-get-fmc-areas"
import { useSelectDateFmc } from '@/hooks/use-select-date-fmc';

export const Filter = () => {
    const { data: areas, isLoading } = useGetFMCAreas()
    const { date: selectedDate, setDate: setSelectedDate } = useSelectDateFmc()
    const { region: selectedRegion, setSelectedRegion } = useSelectRegion()
    const { branch: selectedBranch, setSelectedBranch } = useSelectBranch()
    const { wok, setSelectedWok } = useSelectWok()
    const { setSelectedSto } = useSelectSto()

    const handleRegionChange = (value: string) => {
        setSelectedRegion(value);
        setSelectedBranch("");
        setSelectedWok("");
        setSelectedSto("");
    };

    const handleBranchChange = (value: string) => {
        setSelectedBranch(value);
        setSelectedWok("");
        setSelectedSto("");
    };

    const handleWokChange = (value: string) => {
        setSelectedWok(value);
        setSelectedSto("");
    };

    const handleStoChange = (value: string) => {
        setSelectedSto(value);
    };

    if (isLoading) {
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

    if (!areas) {
        return (
            <div className="w-full">
                <span className="font-semibold text-2xl">No Area.</span>
            </div>
        )
    }

    const handleDateChange = (date: Date | null) => {
        const today = new Date().getDate() - 2;
        const safeDate = date ?? subDays(new Date(), 2)

        const lastDayOfMonth = getDaysInMonth(safeDate)
        const day = Math.min(today, lastDayOfMonth); // Ensure valid day in the month

        // this for month picker, doesnt include day
        setSelectedDate(setDate(new Date(getYear(safeDate), getMonth(safeDate), 1), day));
    }

    const regionalOptions = areas.map(area => ({
        label: area.regional,
        value: area.regional
    }))

    const getFilteredBranches = () => {
        const area = areas.find((a) => a.regional === selectedRegion)
        return area?.branches.map(area => ({ label: area.branchNew, value: area.branchNew })) || [];
    };

    const getFilteredWoks = () => {
        const area = areas.find((a) => a.regional === selectedRegion);
        const branch = area?.branches.find((b) => b.branchNew === selectedBranch);
        return branch?.woks.map(area => ({ label: area.wok, value: area.wok })) || [];
    };

    const getFilteredStos = () => {
        const area = areas.find((a) => a.regional === selectedRegion);
        const branch = area?.branches.find((b) => b.branchNew === selectedBranch);
        const woks = branch?.woks.find(
            (s) => s.wok === wok
        );
        return woks?.stos.map(area => ({ label: area.sto, value: area.sto })) || [];
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
        <div className='grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 lg:grid-cols-5 gap-4'>
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
                <Label>WOK</Label>
                <Select
                    disabled={!selectedBranch}
                    options={getFilteredWoks()}
                    placeholder="Select WOK"
                    onChange={handleWokChange}
                    className="dark:bg-dark-900 h-8 py-1.5 px-2 text-theme-sm"
                />
            </div>
            <div>
                <Label>STO</Label>
                <Select
                    disabled={!wok}
                    options={getFilteredStos()}
                    placeholder="Select STO"
                    onChange={handleStoChange}
                    className="dark:bg-dark-900 h-8 py-1.5 px-2 text-theme-sm"
                />
            </div>
            <div>
                <Label>Periode PS</Label>
                <DatePicker
                    selected={selectedDate ? selectedDate : subDays(new Date(), 2)}
                    renderMonthContent={renderMonthContent}
                    renderCustomHeader={({
                        monthDate,
                        customHeaderCount,
                        decreaseMonth,
                        increaseMonth,
                    }) => (
                        <div>
                            <button
                                aria-label="Previous Month"
                                className={
                                    "react-datepicker__navigation react-datepicker__navigation--previous"
                                }
                                style={customHeaderCount === 1 ? { visibility: "hidden" } : undefined}
                                onClick={decreaseMonth}
                            >
                                <span
                                    className={
                                        "react-datepicker__navigation-icon react-datepicker__navigation-icon--previous"
                                    }
                                >
                                    {"<"}
                                </span>
                            </button>
                            <span className="react-datepicker__current-month">
                                {monthDate.toLocaleString("en-US", {
                                    month: "long",
                                    year: "numeric",
                                })}
                            </span>
                            <button
                                aria-label="Next Month"
                                className={
                                    "react-datepicker__navigation react-datepicker__navigation--next"
                                }
                                style={customHeaderCount === 0 ? { visibility: "hidden" } : undefined}
                                onClick={increaseMonth}
                            >
                                <span
                                    className={
                                        "react-datepicker__navigation-icon react-datepicker__navigation-icon--next"
                                    }
                                >
                                    {">"}
                                </span>
                            </button>
                        </div>
                    )}
                    onChange={(date) => handleDateChange(date)}
                    dateFormat="yyyy-MM"
                    maxDate={subDays(new Date(), 2)}
                    className="w-full text-gray-700 bg-white border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    calendarClassName="shadow-lg border-0"
                    customInput={
                        <input className="w-full h-8 px-2 py-1.5 text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent cursor-pointer" />
                    }
                    wrapperClassName="w-full"
                    showPopperArrow={false}
                    showMonthYearPicker
                />
            </div>
        </div>
    )
}