import { create } from "zustand";

interface UseSelectWok {
    wok?: string;
    setSelectedWok: (val: string) => void;
}

export const useSelectWok = create<UseSelectWok>((set) => ({
    wok: undefined,
    setSelectedWok: (val: string) => set({ wok: val }),
}));

