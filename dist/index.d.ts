import * as svelte_store from 'svelte/store';

/**
 * This type represents the state of an item in the cache store. The state can be one of the following:
 * - 'loading': The item is being fetched from the backend.
 * - 'loaded': The item has been successfully fetched from the backend.
 * - 'updating': The item is being updated on the backend.
 * - 'deleting': The item is being deleted from the backend.
 * - 'error': An error occurred while fetching, updating, or deleting the item.
 */
type CacheState = 'loading' | 'loaded' | 'updating' | 'deleting' | 'error';
/**
 * This interface represents the base structure of an item in the cache store. Any item that is stored in the cache
 * store must implement this interface. It enforces that each item has a unique ID from the backend, and adds a state
 * property to track the state of the item (loading, loaded, updating, deleting, or error). The error property is a
 * boolean that indicates whether an error occurred while fetching, updating, or deleting the item. The errorMessage
 * property contains the error message if an error occurred, or null if no error occurred.
 *
 * @param id - The unique ID of the item.
 * @param state - The state of the item (loading, loaded, updating, deleting, or error).
 * @param error - A boolean indicating whether an error occurred while fetching, updating, or deleting the item.
 * @param errorMessage - The error message if an error occurred, or null if no error occurred.
 */
interface CacheItem {
    id: string;
    state: CacheState;
    error: boolean;
    errorMessage: string | null;
}
interface SortColumn {
    sortColumn: string;
    sortOrder?: 'ascending' | 'asc' | 'descending' | 'desc';
}
declare let cacheStore: {
    registerType: <T extends CacheItem>(singularName: string, pluralName: string, apiPrefix: string) => void;
    fetchById: <T extends CacheItem>(singularName: string, id: string) => Promise<T>;
    fetchAll: <T extends CacheItem>(singularName: string, sortColumns?: SortColumn[]) => Promise<T[]>;
    reloadById: <T extends CacheItem>(singularName: string, id: string) => Promise<T>;
    reloadAll: <T extends CacheItem>(singularName: string, sortColumns?: SortColumn[]) => Promise<T[]>;
    create: <T extends CacheItem>(singularName: string, item: T) => Promise<void>;
    update: <T extends CacheItem>(singularName: string, id: string, item: Partial<T>) => Promise<void>;
    remove: <T extends CacheItem>(singularName: string, id: string) => Promise<void>;
    getCache: <T extends CacheItem>(singularName: string) => svelte_store.Writable<{
        [id: string]: T;
    }>;
};

export { CacheItem, CacheState, cacheStore };
