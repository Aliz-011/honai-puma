import { create } from "zustand";

interface UseSelectCluster {
    cluster?: string;
    setSelectedCluster: (val: string) => void;
}

export const useSelectCluster = create<UseSelectCluster>((set) => ({
    cluster: undefined,
    setSelectedCluster: (val: string) => set({ cluster: val }),
}));

