import { create } from "zustand";

interface UseSelectDate {
	date?: Date;
	setDate: (val: Date) => void;
}

export const useSelectDate = create<UseSelectDate>((set) => ({
	date: undefined,
	setDate: (val: Date) => set({ date: val }),
}));
