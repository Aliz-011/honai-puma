import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
	return twMerge(clsx(inputs));
}

export function formatToBillion(number: number) {
	return (number / 1_000_000_000).toLocaleString("id-ID", {
		minimumFractionDigits: 2,
		maximumFractionDigits: 2,
	});
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

function getLastDayOfMonth(date: Date) {
	// Create a new date object for the first day of the next month
	const nextMonth = new Date(date.getFullYear(), date.getMonth() + 1, 1);
	// Subtract one day to get the last day of the current month
	const lastDay = new Date(nextMonth.getTime() - 86400000); // 86400000 ms = 1 day
	return lastDay.getDate();
}