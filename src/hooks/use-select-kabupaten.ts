import { create } from "zustand";

interface UseSelectKabupaten {
    kabupaten?: string;
    setSelectedKabupaten: (val: string) => void;
}

export const useSelectKabupaten = create<UseSelectKabupaten>((set) => ({
    kabupaten: undefined,
    setSelectedKabupaten: (val: string) => set({ kabupaten: val }),
}));
