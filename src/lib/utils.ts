import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import Exceljs from 'exceljs'
import FileSaver from 'file-saver'
import { endOfMonth, format, getDaysInMonth, intlFormat, subMonths, subYears } from "date-fns";
import { encodeBase32UpperCaseNoPadding } from "@oslojs/encoding";

export function cn(...inputs: ClassValue[]) {
	return twMerge(clsx(inputs));
}

export function generateRandomOTP(): string {
	const bytes = new Uint8Array(5);
	crypto.getRandomValues(bytes);
	const code = encodeBase32UpperCaseNoPadding(bytes);
	return code;
}

export function generateRandomRecoveryCode(): string {
	const recoveryCodeBytes = new Uint8Array(10);
	crypto.getRandomValues(recoveryCodeBytes);
	const recoveryCode = encodeBase32UpperCaseNoPadding(recoveryCodeBytes);
	return recoveryCode;
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
		maximumFractionDigits: 0,
		minimumFractionDigits: 0,
	})
}

export function formatToPercentage(number: number) {
	return (number).toLocaleString('id-ID', {
		maximumFractionDigits: 2,
		minimumFractionDigits: 2,
	})
}

function formatToNormalNumber(number: number) {
	return Number(number.toFixed(0))
}

export const getGrowthColor = (value: number) => {
	if (value > 0) {
		return true
	}

	return false
};

export const getAchGrowthColor = (value: number) => {
	if (value >= 100) {
		return true
	}

	return false
};

export async function exportToExcel(data: Regional[], fileName: string, selectedDate: Date) {
	const workbook = new Exceljs.Workbook();
	const worksheet = workbook.addWorksheet('Sheet1');

	const lastDayOfSelectedMonth = endOfMonth(selectedDate);
	const isEndOfMonth = selectedDate.getDate() === lastDayOfSelectedMonth.getDate();

	// Last days of months
	const daysInCurrMonth = isEndOfMonth ? getDaysInMonth(selectedDate) : getDaysInMonth(selectedDate)
	const currDate = parseInt(format(selectedDate, 'd'))

	const endOfCurrMonth = isEndOfMonth ? lastDayOfSelectedMonth : selectedDate;
	const endOfPrevMonth = isEndOfMonth ? endOfMonth(subMonths(selectedDate, 1)) : subMonths(selectedDate, 1);
	const endOfPrevYearSameMonth = isEndOfMonth ? endOfMonth(subYears(selectedDate, 1)) : subYears(selectedDate, 1);

	const currMonth = intlFormat(endOfCurrMonth, { dateStyle: 'medium' }, { locale: 'id-ID' })
	const prevMonth = intlFormat(endOfPrevMonth, { dateStyle: 'medium' }, { locale: 'id-ID' })
	const prevYearSameMonth = intlFormat(endOfPrevYearSameMonth, { dateStyle: 'medium' }, { locale: 'id-ID' })

	worksheet.columns = [
		{ header: 'Territory', key: 'territory', width: 25 },
		{ header: 'Target', key: 'target', width: 15 },
		{ header: currMonth, key: 'thisMonth', width: 15 },
		{ header: prevMonth, key: 'prevMonth', width: 15 },
		{ header: prevYearSameMonth, key: 'prevYearSameMonth', width: 15 },
		{ header: `YtD ${selectedDate.getFullYear()}`, key: `YtD${selectedDate.getFullYear()}`, width: 15 },
		{ header: `YtD ${selectedDate.getFullYear() - 1}`, key: `YtD${selectedDate.getFullYear() - 1}`, width: 15 },
		{ header: 'Ach FM', key: 'achFM', width: 15 },
		{ header: 'Ach DRR', key: 'achDRR', width: 15 },
		{ header: 'MoM', key: 'MoM', width: 15 },
		{ header: 'YoY', key: 'YoY', width: 15 },
		{ header: 'YtD', key: 'YtD', width: 15 },
	]

	const headerRow = worksheet.getRow(1);
	headerRow.font = { bold: true, color: { argb: 'FFFFFF' } };
	headerRow.alignment = { horizontal: 'center' };

	for (let i = 1; i <= 12; i++) {
		const cell = headerRow.getCell(i);

		if (i === 1) {
			// First column - red
			cell.fill = {
				type: 'pattern',
				pattern: 'solid',
				fgColor: { argb: 'f43f5e' }
			};
		} else if (i === 2) {
			// Second columns - blue
			cell.fill = {
				type: 'pattern',
				pattern: 'solid',
				fgColor: { argb: '3b82f6' }
			};
		} else {
			// Other columns - blue
			cell.fill = {
				type: 'pattern',
				pattern: 'solid',
				fgColor: { argb: '09090b' }
			};
		}
	}

	addCategoryRow(worksheet, 'Regional', true);
	data.forEach(regional => {
		addDataRow(worksheet, regional, currDate, daysInCurrMonth);
	})

	addCategoryRow(worksheet, 'Branch', true);
	data.forEach(regional => {
		regional.branches.forEach(branch => {
			addDataRow(worksheet, branch, currDate, daysInCurrMonth)
		})
	})

	addCategoryRow(worksheet, 'Subbranch', true)
	let allSubbranches: Subbranch[] = []
	data.forEach(regional => {
		regional.branches.forEach(branch => {
			branch.subbranches.forEach(subbranch => {
				allSubbranches.push(subbranch)
			})
		})
	})

	allSubbranches.forEach(subbranch => {
		addDataRow(worksheet, subbranch, currDate, daysInCurrMonth)
	})

	addCategoryRow(worksheet, 'Cluster', true);
	allSubbranches.forEach(subbranch => {
		subbranch.clusters.forEach(cluster => {
			addDataRow(worksheet, cluster, currDate, daysInCurrMonth)
		})
	})

	addCategoryRow(worksheet, 'Kabupaten', true);
	allSubbranches.forEach(subbranch => {
		subbranch.clusters.forEach(cluster => {
			cluster.kabupatens.forEach(kabupaten => {
				addDataRow(worksheet, kabupaten, currDate, daysInCurrMonth)
			})
		})
	})

	worksheet.eachRow((row, rowNumber) => {
		row.eachCell((cell, colNumber) => {
			cell.border = {
				top: { style: 'thin' },
				left: { style: 'thin' },
				right: { style: 'thin' },
				bottom: { style: 'thin' },
			}
		})
	})

	const buffer = await workbook.xlsx.writeBuffer();
	FileSaver.saveAs(new Blob([buffer]), `${fileName}_${formatDateForFilename(selectedDate)}.xlsx`)
}

function formatDateForFilename(date: Date): string {
	return format(date, 'yyyyMMdd');
}

function addCategoryRow(worksheet: Exceljs.Worksheet, category: string, isBold: boolean = false) {
	const row = worksheet.addRow([category]);

	if (isBold) {
		row.font = { bold: true };
	}

	for (let i = 1; i <= 12; i++) {
		const cell = row.getCell(i);

		cell.fill = {
			type: 'pattern',
			pattern: 'solid',
			fgColor: { argb: 'F2F2F2' }
		};

	}

	// Merge cells for category row
	worksheet.mergeCells(`A${row.number}:L${row.number}`);
}

function addDataRow(worksheet: Exceljs.Worksheet, data: QuickType, currDate: number, daysInCurrMonth: number) {
	const achFM = data.currMonthRevenue / data.currMonthTarget * 100;
	const achDRR = ((data.currMonthRevenue / currDate) * daysInCurrMonth) / data.currMonthTarget * 100
	const mom = (data.currMonthRevenue - data.prevMonthRevenue) / data.prevMonthRevenue * 100;
	const yoy = ((data.currMonthRevenue - data.prevYearCurrMonthRevenue) / data.prevYearCurrMonthRevenue * 100)
	const ytd = (data.currYtdRevenue - data.prevYtdRevenue) / data.prevYtdRevenue * 100

	// Add the row with data
	const row = worksheet.addRow([
		data.name,
		formatToNormalNumber(data.currMonthTarget),
		formatToNormalNumber(data.currMonthRevenue),
		formatToNormalNumber(data.prevMonthRevenue),
		formatToNormalNumber(data.prevYearCurrMonthRevenue),
		formatToNormalNumber(data.currYtdRevenue),
		formatToNormalNumber(data.prevYtdRevenue),
		formatToPercentage(achFM) + '%',
		formatToPercentage(achDRR) + '%',
		formatToPercentage(mom) + '%',
		formatToPercentage(yoy) + '%',
		formatToPercentage(ytd) + '%'
	]);

	// Style numbers as numbers
	for (let i = 2; i <= 7; i++) {
		const cell = row.getCell(i);
		cell.numFmt = '#,##0';
	}

	// Style percentages with colors
	for (let i = 8; i <= 12; i++) {
		const cell = row.getCell(i);
		cell.alignment = { horizontal: 'center' };

		// Get the percentage value
		const value = [achFM, achDRR, mom, yoy, ytd][i - 8];

		// Set color based on value
		if (value > 0) {
			cell.font = { color: { argb: '00B050' } }; // Green for positive
		} else if (value < 0) {
			cell.font = { color: { argb: 'FF0000' } }; // Red for negative
		}
	}
}

type QuickType = {
	name: string;
	currMonthRevenue: number;
	currMonthTarget: number;
	currYtdRevenue: number;
	prevYtdRevenue: number;
	prevMonthRevenue: number;
	prevYearCurrMonthRevenue: number;
}