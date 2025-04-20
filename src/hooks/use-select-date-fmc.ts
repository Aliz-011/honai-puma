import { create } from "zustand";

interface UseSelectDateFMC {
    date?: Date;
    setDate: (val: Date) => void;
}

export const useSelectDateFmc = create<UseSelectDateFMC>((set) => ({
    date: undefined,
    setDate: (val: Date) => set({ date: val }),
}));
