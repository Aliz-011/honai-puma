import { create } from "zustand";

interface UseSelectBranch {
    branch?: string;
    setSelectedBranch: (val: string) => void;
}

export const useSelectBranch = create<UseSelectBranch>((set) => ({
    branch: undefined,
    setSelectedBranch: (val: string) => set({ branch: val }),
}));
