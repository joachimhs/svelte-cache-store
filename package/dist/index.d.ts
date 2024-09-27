type CacheState = 'loading' | 'loaded' | 'updating' | 'deleting' | 'error';
interface CacheItem<T> {
    data: T | null;
    state: CacheState;
    error: boolean;
    errorMessage: string | null;
}
interface SortColumn {
    sortColumn: string;
    sortOrder?: 'ascending' | 'asc' | 'descending' | 'desc';
}
declare let cacheStore: {
    registerType: <T>(singularName: string, pluralName: string, apiPrefix: string) => void;
    fetchById: <T_1>(singularName: string, id: string) => Promise<CacheItem<T_1>>;
    fetchAll: <T_2>(singularName: string, sortColumns?: SortColumn[]) => Promise<CacheItem<T_2>[]>;
    reloadById: <T_3>(singularName: string, id: string) => Promise<CacheItem<T_3>>;
    reloadAll: <T_4>(singularName: string, sortColumns?: SortColumn[]) => Promise<CacheItem<T_4>[]>;
    create: <T_5>(singularName: string, item: T_5) => Promise<void>;
    update: <T_6>(singularName: string, id: string, item: Partial<T_6>) => Promise<void>;
    remove: <T_7>(singularName: string, id: string) => Promise<void>;
    getCache: (typeName: string) => any;
};

export { cacheStore };
