import { create } from "zustand";

interface UseSelectSubbranch {
    subbranch?: string;
    setSelectedSubbranch: (val: string) => void;
}

export const useSelectSubbranch = create<UseSelectSubbranch>((set) => ({
    subbranch: undefined,
    setSelectedSubbranch: (val: string) => set({ subbranch: val }),
}));

