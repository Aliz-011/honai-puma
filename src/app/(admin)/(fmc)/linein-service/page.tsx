'use client'

import PageBreadcrumb from "@/components/common/PageBreadCrumb"
import { Filter } from "../filter"
import { DataTable, DataTableARPU, DataTableRGB } from "../data-table"
import { useGetLineInService } from "@/modules/fmc/hooks/use-get-linein-service"
import { useSelectDateFmc } from "@/hooks/use-select-date-fmc"

const LineInServicePage = () => {
    const { date: selectedDate } = useSelectDateFmc()
    const { data, isLoading, isFetching } = useGetLineInService({ date: selectedDate?.toDateString() })

    const rgbAll = data?.map(row => ({
        name: row.name,
        rgbMtd: row.rgbAll,
        rgbM1: row.rgbAllM1,
        rgbM2: row.rgbAllM2,
        rgbM3: row.rgbAllM3,
        branches: row.branches.map(branch => ({
            name: branch.name,
            rgbMtd: branch.rgbAll,
            rgbM1: branch.rgbAllM1,
            rgbM2: branch.rgbAllM2,
            rgbM3: branch.rgbAllM3,
            woks: branch.woks.map(wok => ({
                name: wok.name,
                rgbMtd: wok.rgbAll,
                rgbM1: wok.rgbAllM1,
                rgbM2: wok.rgbAllM2,
                rgbM3: wok.rgbAllM3,
                stos: wok.stos.map(sto => ({
                    name: sto.name,
                    rgbMtd: sto.rgbAll,
                    rgbM1: sto.rgbAllM1,
                    rgbM2: sto.rgbAllM2,
                    rgbM3: sto.rgbAllM3,
                }))
            }))
        }))
    }))

    const rgbDigital = data?.map(row => ({
        name: row.name,
        rgbMtd: row.rgbDigital,
        rgbM1: row.rgbDigitalM1,
        rgbM2: row.rgbDigitalM2,
        rgbM3: row.rgbDigitalM3,
        branches: row.branches.map(branch => ({
            name: branch.name,
            rgbMtd: branch.rgbDigital,
            rgbM1: branch.rgbDigitalM1,
            rgbM2: branch.rgbDigitalM2,
            rgbM3: branch.rgbDigitalM3,
            woks: branch.woks.map(wok => ({
                name: wok.name,
                rgbMtd: wok.rgbDigital,
                rgbM1: wok.rgbDigitalM1,
                rgbM2: wok.rgbDigitalM2,
                rgbM3: wok.rgbDigitalM3,
                stos: wok.stos.map(sto => ({
                    name: sto.name,
                    rgbMtd: sto.rgbDigital,
                    rgbM1: sto.rgbDigitalM1,
                    rgbM2: sto.rgbDigitalM2,
                    rgbM3: sto.rgbDigitalM3,
                }))
            }))
        }))
    }))

    const rgbVoice = data?.map(row => ({
        name: row.name,
        rgbMtd: row.rgbVoice,
        rgbM1: row.rgbVoiceM1,
        rgbM2: row.rgbVoiceM2,
        rgbM3: row.rgbVoiceM3,
        branches: row.branches.map(branch => ({
            name: branch.name,
            rgbMtd: branch.rgbVoice,
            rgbM1: branch.rgbVoiceM1,
            rgbM2: branch.rgbVoiceM2,
            rgbM3: branch.rgbVoiceM3,
            woks: branch.woks.map(wok => ({
                name: wok.name,
                rgbMtd: wok.rgbVoice,
                rgbM1: wok.rgbVoiceM1,
                rgbM2: wok.rgbVoiceM2,
                rgbM3: wok.rgbVoiceM3,
                stos: wok.stos.map(sto => ({
                    name: sto.name,
                    rgbMtd: sto.rgbVoice,
                    rgbM1: sto.rgbVoiceM1,
                    rgbM2: sto.rgbVoiceM2,
                    rgbM3: sto.rgbVoiceM3,
                }))
            }))
        }))
    }))

    const rgbData = data?.map(row => ({
        name: row.name,
        rgbMtd: row.rgbData,
        rgbM1: row.rgbDataM1,
        rgbM2: row.rgbDataM2,
        rgbM3: row.rgbDataM3,
        branches: row.branches.map(branch => ({
            name: branch.name,
            rgbMtd: branch.rgbData,
            rgbM1: branch.rgbDataM1,
            rgbM2: branch.rgbDataM2,
            rgbM3: branch.rgbDataM3,
            woks: branch.woks.map(wok => ({
                name: wok.name,
                rgbMtd: wok.rgbData,
                rgbM1: wok.rgbDataM1,
                rgbM2: wok.rgbDataM2,
                rgbM3: wok.rgbDataM3,
                stos: wok.stos.map(sto => ({
                    name: sto.name,
                    rgbMtd: sto.rgbData,
                    rgbM1: sto.rgbDataM1,
                    rgbM2: sto.rgbDataM2,
                    rgbM3: sto.rgbDataM3,
                }))
            }))
        }))
    }))

    return (
        <div>
            <PageBreadcrumb pageTitle="FMC Line In Service" />
            <div className="overflow-hidden min-h-screen rounded-2xl border border-gray-200 bg-white px-5 py-7 dark:border-gray-800 dark:bg-white/[0.03] space-y-8">
                <Filter />
                <DataTable isLoading={isLoading || isFetching} data={data} title='Revenue' date={selectedDate} />
                <DataTableARPU isLoading={isLoading || isFetching} data={data} title='ARPU' date={selectedDate} />
                <DataTableRGB isLoading={isLoading || isFetching} data={rgbAll} title='RGB ALL' date={selectedDate} />
                <DataTableRGB isLoading={isLoading || isFetching} data={rgbDigital} title='RGB DIGITAL' date={selectedDate} />
                <DataTableRGB isLoading={isLoading || isFetching} data={rgbVoice} title='RGB VOICE' date={selectedDate} />
                <DataTableRGB isLoading={isLoading || isFetching} data={rgbData} title='RGB DATA' date={selectedDate} />
            </div>
        </div>
    )
}
export default LineInServicePage