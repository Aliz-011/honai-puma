import { create } from "zustand";

interface UseSelectRegion {
	region: string;
	setSelectedRegion: (val: string) => void;
}

export const useSelectRegion = create<UseSelectRegion>((set) => ({
	region: "MALUKU DAN PAPUA",
	setSelectedRegion: (val: string) => set({ region: val }),
}));
