type Kabupaten = {
    name: string;
    currMonthRevenue: number;
    currMonthTarget: number;
    currYtdRevenue: number;
    prevYtdRevenue: number;
    prevMonthRevenue: number;
    prevYearCurrMonthRevenue: number;
};

type Cluster = {
    name: string;
    currMonthRevenue: number;
    currMonthTarget: number;
    currYtdRevenue: number;
    prevYtdRevenue: number;
    prevMonthRevenue: number;
    prevYearCurrMonthRevenue: number;
    kabupatens: Kabupaten[];
};

type Subbranch = {
    name: string;
    currMonthRevenue: number;
    currMonthTarget: number;
    currYtdRevenue: number;
    prevYtdRevenue: number;
    prevMonthRevenue: number;
    prevYearCurrMonthRevenue: number;
    clusters: Cluster[];
};

type Branch = {
    name: string;
    currMonthRevenue: number;
    currMonthTarget: number;
    currYtdRevenue: number;
    prevYtdRevenue: number;
    prevMonthRevenue: number;
    prevYearCurrMonthRevenue: number;
    subbranches: Subbranch[];
};

type Regional = {
    name: string;
    currMonthRevenue: number;
    currMonthTarget: number;
    currYtdRevenue: number;
    prevYtdRevenue: number;
    prevMonthRevenue: number;
    prevYearCurrMonthRevenue: number;
    branches: Branch[];
};