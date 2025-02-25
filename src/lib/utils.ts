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

export function transformData(flatData: any[]) {
	const result: Regional[] = [];

	flatData.forEach(item => {
		// Find or create the regional
		let regional = result.find(r => r.id === item.id);
		if (!regional) {
			regional = {
				id: item.id,
				regional: item.regionalName,
				branches: []
			};
			result.push(regional);
		}

		// Find or create the branch
		let branch = regional.branches.find(b => b.branchNew === item.branchName);
		if (!branch) {
			branch = {
				id: item.id,
				regionalId: item.id,
				branchNew: item.branchName,
				subbranches: []
			};
			regional.branches.push(branch);
		}

		// Find or create the subbranch
		let subbranch = branch.subbranches.find(s => s.subbranchNew === item.subbranchName);
		if (!subbranch) {
			subbranch = {
				id: item.id,
				branchId: item.id,
				subbranchNew: item.subbranchName,
				clusters: []
			};
			branch.subbranches.push(subbranch);
		}

		// Find or create the cluster
		let cluster = subbranch.clusters.find(c => c.cluster === item.clusterName);
		if (!cluster) {
			cluster = {
				id: item.id,
				subbranchId: item.id,
				cluster: item.clusterName,
				kabupatens: []
			};
			subbranch.clusters.push(cluster);
		}

		// Add the kabupaten
		cluster.kabupatens.push({
			id: item.id,
			clusterId: item.id,
			kabupaten: item.kabupatenName,
			totalRevenue: item.totalRevenue
		});
	});

	return { data: result };
}