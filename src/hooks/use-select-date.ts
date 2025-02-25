import { create } from "zustand";

interface UseSelectDate {
	date: Date;
	setDate: (val: Date) => void;
}

export const useSelectDate = create<UseSelectDate>((set) => ({
	date: new Date(),
	setDate: (val: Date) => set({ date: val }),
}));
