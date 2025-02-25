type Kabupaten = {
    id: string;
    clusterId: string;
    kabupaten: string;
    totalRevenue: number;
};

type Cluster = {
    id: string;
    subbranchId: string;
    cluster: string;
    kabupatens: Kabupaten[];
};

type Subbranch = {
    id: string;
    branchId: string;
    subbranchNew: string;
    clusters: Cluster[];
};

type Branch = {
    id: string;
    regionalId: string;
    branchNew: string;
    subbranches: Subbranch[];
};

type Regional = {
    id: string;
    regional: string;
    branches: Branch[];
};