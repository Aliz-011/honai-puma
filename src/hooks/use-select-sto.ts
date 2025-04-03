import { create } from "zustand";

interface UseSelectSto {
    sto?: string;
    setSelectedSto: (val: string) => void;
}

export const useSelectSto = create<UseSelectSto>((set) => ({
    sto: undefined,
    setSelectedSto: (val: string) => set({ sto: val }),
}));

