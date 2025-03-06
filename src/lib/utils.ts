import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import * as XLSX from 'xlsx'
import FileSaver from 'file-saver'

export function cn(...inputs: ClassValue[]) {
	return twMerge(clsx(inputs));
}

export function formatToBillion(number: number) {
	return (number).toLocaleString("id-ID", {
		maximumFractionDigits: 0,
		minimumFractionDigits: 0
	})
}

export function formatToIDR(number: number) {
	return (number).toLocaleString("id-ID", {
		style: 'currency',
		currency: 'IDR',
		maximumFractionDigits: 2,
		minimumFractionDigits: 2,
	})
}

export function formatToPercentage(number: number) {
	return (number).toLocaleString('id-ID', {
		minimumFractionDigits: 2,
		maximumFractionDigits: 2,
	})
}

export const getGrowthColor = (value: number) => {
	if (value > 0) {
		return true
	}

	return false
};

export const getDaysInMonth = (year: number, month: number) => {
	return new Date(year, month + 1, 0).getDate();
};

export function downloadToXlsx(data: any[], fileName: string, header: string[]) {
	const ws = XLSX.utils.book_new();
	XLSX.utils.sheet_add_aoa(ws, [header])
	XLSX.utils.sheet_add_json(ws, data, { origin: 'A2', skipHeader: true })
	const wb = { Sheets: { 'data': ws }, SheetNames: ['data'] }
	const excelBuffer = XLSX.write(wb, { bookType: 'xlsx', type: 'array', cellStyles: true });
	const fileType =
		"application/vnd.openxmlformats-officedocument.spreadsheetml.sheet;charset=UTF-8";
	const fileExtension = ".xlsx";
	const finalData = new Blob([excelBuffer], { type: fileType });
	FileSaver.saveAs(finalData, fileName + fileExtension);
}