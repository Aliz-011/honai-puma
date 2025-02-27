import { create } from "zustand";

interface UseSelectRegion {
	region: string;
	setSelectedRegion: (val: string) => void;
}

export const useSelectRegion = create<UseSelectRegion>((set) => ({
	region: "PUMA",
	setSelectedRegion: (val: string) => set({ region: val }),
}));
