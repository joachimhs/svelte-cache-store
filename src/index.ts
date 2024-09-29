import { writable, get } from 'svelte/store';

/**
 * This type represents the state of an item in the cache store. The state can be one of the following:
 * - 'loading': The item is being fetched from the backend.
 * - 'loaded': The item has been successfully fetched from the backend.
 * - 'updating': The item is being updated on the backend.
 * - 'deleting': The item is being deleted from the backend.
 * - 'error': An error occurred while fetching, updating, or deleting the item.
 */
export type CacheState = 'loading' | 'loaded' | 'updating' | 'deleting' | 'error';

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
export interface CacheItem {
    id: string;
    state: CacheState;
    error: boolean;
    errorMessage: string | null;
}

interface SortColumn {
    sortColumn: string;
    sortOrder?: 'ascending' | 'asc' | 'descending' | 'desc';
}

interface CacheRegistry<T extends CacheItem> {
    cache: ReturnType<typeof writable<{ [id: string]: T }>>;
    singularName: string;
    pluralName: string;
    apiPrefix: string;
    hasFetchedAll: boolean;
}

// Type guard to check if the error is an instance of Error
function isErrorWithMessage(error: unknown): error is { message: string } {
    return (
        typeof error === 'object' &&
        error !== null &&
        'message' in error &&
        typeof (error as any).message === 'string'
    );
}

export let cacheStore = createCacheStore();

/**
 * Create a cache store for fetching, creating, updating, and deleting items of a specific type adhering to the
 * simple-json-api specification
 */
function createCacheStore() {
    const registry = new Map<string, CacheRegistry<any>>();

    /**
     * Register a type in the cache store. The type must be registered before any operations can be performed on it.
     * @param singularName
     * @param pluralName
     * @param apiPrefix
     */
    function registerType<T extends CacheItem>(singularName: string, pluralName: string, apiPrefix: string) {
        const cache = writable<{ [id: string]: T }>({});
        registry.set(singularName, {
            cache,
            singularName,
            pluralName,
            apiPrefix,
            hasFetchedAll: false,
        } as CacheRegistry<T>);
    }

    /**
     * Get the cached items for a specific type.
     * @param singularName
     */
    function getCache<T extends CacheItem>(singularName: string) {
        const registryEntry = registry.get(singularName) as CacheRegistry<T>;
        if (!registryEntry) {
            throw new Error(`Type ${singularName} is not registered in the cache store.`);
        }
        return registryEntry.cache;
    }

    /**
     * Sort the data based on the provided list of sort columns, starting with the first column in the list.
     * @param data
     * @param sortColumns
     */
    function sortData<T>(data: T[], sortColumns?: SortColumn[]): T[] {
        if (!sortColumns || sortColumns.length === 0) return data;

        return data.sort((a, b) => {
            for (let sort of sortColumns) {
                const { sortColumn, sortOrder } = sort;
                const order = sortOrder?.toLowerCase();

                const aValue = (a as any)[sortColumn];
                const bValue = (b as any)[sortColumn];

                if (aValue < bValue) return order === 'desc' || order === 'descending' ? 1 : -1;
                if (aValue > bValue) return order === 'desc' || order === 'descending' ? -1 : 1;
            }
            return 0;
        });
    }

    /**
     * Fetch an item by its ID.
     * @param singularName
     * @param id
     */
    async function fetchById<T extends CacheItem>(singularName: string, id: string): Promise<T> {
        const typeRegistry = registry.get(singularName) as CacheRegistry<T>;
        if (!typeRegistry)
            throw new Error(`Type ${singularName} is not registered in the cache store.`);

        const { cache, pluralName, apiPrefix } = typeRegistry;

        let cacheValue = (get(cache) as { [key: string]: T })[id];

        // If the item is not in the cache or is in an error state, fetch it from the backend
        if (!cacheValue || (cacheValue != null && cacheValue.state === 'error')) {
            cacheValue = {
                id,
                state: 'loading',
                error: false,
                errorMessage: null,
            } as T;
            cache.update((current: any) => ({ ...current, [id]: cacheValue }));

            try {
                const response = await fetch(`${apiPrefix}/${pluralName}/${id}`);
                if (!response.ok) throw new Error(`Failed to fetch: ${response.statusText}`);

                const json = await response.json();
                handleSideLoading(singularName, pluralName, json);

                const data = json[singularName] as T;
                data.state = 'loaded';
                data.error = false;
                data.errorMessage = null;

                cache.update((current: any) => ({ ...current, [id]: data }));
                cacheValue = data;
            } catch (error) {
                let errorMessage = 'An unknown error occurred';
                if (isErrorWithMessage(error)) {
                    errorMessage = error.message;
                }
                cache.update((current: any) => ({
                    ...current,
                    [id]: { ...cacheValue, state: 'error', error: true, errorMessage },
                }));
                console.error(`Failed to fetch ${id}:`, errorMessage);
            }
        }

        return cacheValue;
    }

    /**
     * Fetch all items of a specific type.
     * @param singularName
     * @param sortColumns
     */
    async function fetchAll<T extends CacheItem>(singularName: string, sortColumns?: SortColumn[]): Promise<T[]> {
        const typeRegistry = registry.get(singularName) as CacheRegistry<T>;
        if (!typeRegistry)
            throw new Error(`Type ${singularName} is not registered in the cache store.`);

        const { cache, pluralName, apiPrefix, hasFetchedAll } = typeRegistry;
        let cacheValue = get(cache) as { [key: string]: T };

        //Return immediately if all data has been fetched for this type
        if (hasFetchedAll) {
            return Object.values(cacheValue);
        }

        try {
            const response = await fetch(`${apiPrefix}/${pluralName}`);
            if (!response.ok) throw new Error(`Failed to fetch: ${response.statusText}`);

            const json = await response.json();
            handleSideLoading(singularName, pluralName, json);

            let items = json[pluralName] as T[];
            items = sortData(items, sortColumns);

            items.forEach((item) => {
                item.state = 'loaded';
                item.error = false;
                item.errorMessage = null;
            });

            const newCacheValue = Object.fromEntries(items.map((item: T) => [item.id, item]));
            cache.set(newCacheValue);

            // Mark this data as having been fetched
            typeRegistry.hasFetchedAll = true;
            cacheValue = newCacheValue;
        } catch (error) {
            let errorMessage = 'An unknown error occurred';
            if (isErrorWithMessage(error)) {
                errorMessage = error.message;
            }

            cache.update((current: any) => {
                const updated = { ...current };
                Object.keys(updated).forEach((id) => {
                    updated[id].state = 'error';
                    updated[id].error = true;
                    updated[id].errorMessage = errorMessage;
                });
                return updated;
            });
            console.error('Failed to fetch all:', errorMessage);
        }

        return Object.values(cacheValue);
    }

    /**
     * Handle side-loading of data.
     * @param mainSingularKey
     * @param mainPluralKey
     * @param data
     */
    function handleSideLoading(mainSingularKey: string, mainPluralKey: string, data: any) {
        for (let key of Object.keys(data)) {
            // iterate over registered types to find matching pluralName
            let sideloadKey = null;
            for (let [singularName, registryValue] of registry) {
                if (registryValue.pluralName === key) {
                    sideloadKey = singularName;
                    break;
                }
            }

            if (key !== mainSingularKey && key !== mainPluralKey && sideloadKey !== null) {
                const registryEntry = registry.get(sideloadKey)!;
                const cache = registryEntry.cache;
                let sideLoadedData = data[key];

                if (Array.isArray(sideLoadedData)) {
                    sideLoadedData.forEach((item: CacheItem) => {
                        item.state = 'loaded';
                        item.error = false;
                        item.errorMessage = null;
                    });

                    let sideLoadedCache = Object.fromEntries(
                        sideLoadedData.map((item: CacheItem) => [item.id, item])
                    );

                    cache.update((current: any) => ({ ...current, ...sideLoadedCache }));
                } else {
                    console.warn(
                        `Expected an array for side-loaded data '${key}', but received`,
                        sideLoadedData
                    );
                }
            }
        }
    }

    /**
     * Reload an item by its ID. This function first removes the item from the cache and then fetches it from the
     * backend via fetchById.
     * @param singularName
     * @param id
     */
    async function reloadById<T extends CacheItem>(singularName: string, id: string): Promise<T> {
        const typeRegistry = registry.get(singularName) as CacheRegistry<T>;
        if (!typeRegistry)
            throw new Error(`Type ${singularName} is not registered in the cache store.`);

        const { cache } = typeRegistry;
        cache.update((current: { [x: string]: any }) => {
            const { [id]: _, ...rest } = current;
            return rest;
        });
        return await fetchById<T>(singularName, id);
    }

    /**
     * Reload all items of a specific type. This function first invalidates the cache for the type and then fetches all
     * items from the backend via fetchAll.
     * @param singularName
     * @param sortColumns
     */
    async function reloadAll<T extends CacheItem>(
        singularName: string,
        sortColumns?: SortColumn[]
    ): Promise<T[]> {
        const typeRegistry = registry.get(singularName) as CacheRegistry<T>;
        if (!typeRegistry)
            throw new Error(`Type ${singularName} is not registered in the cache store.`);

        const { cache } = typeRegistry;
        cache.set({}); // Invalidate all cache

        // Reset the hasFetchedAll flag before re-fetching
        typeRegistry.hasFetchedAll = false;

        return await fetchAll<T>(singularName, sortColumns);
    }

    /**
     * Create a new item. The item must be of a type that has been registered in the cache store, and the type
     * needs to extend the CacheItem interface.
     * @param singularName
     * @param item
     */
    async function create<T extends CacheItem>(singularName: string, item: T): Promise<void> {
        const typeRegistry = registry.get(singularName) as CacheRegistry<T>;
        if (!typeRegistry)
            throw new Error(`Type ${singularName} is not registered in the cache store.`);

        const { cache, pluralName, apiPrefix } = typeRegistry;

        try {
            const response = await fetch(`${apiPrefix}/${pluralName}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ [singularName]: item }),
            });

            if (!response.ok) throw new Error(`Failed to create: ${response.statusText}`);

            const json = await response.json();
            handleSideLoading(singularName, pluralName, json);

            const newItem = json[singularName] as T;
            newItem.state = 'loaded';
            newItem.error = false;
            newItem.errorMessage = null;

            cache.update((current: any) => ({
                ...current,
                [newItem.id]: newItem,
            }));
        } catch (error) {
            let errorMessage = 'An unknown error occurred';
            if (isErrorWithMessage(error)) {
                errorMessage = error.message;
            }
            console.error('Failed to create item:', errorMessage);
        }
    }

    /**
     * Update an item by its ID.
     * @param singularName
     * @param id
     * @param item
     */
    async function update<T extends CacheItem>(singularName: string, id: string, item: Partial<T>): Promise<void> {
        const typeRegistry = registry.get(singularName) as CacheRegistry<T>;
        if (!typeRegistry)
            throw new Error(`Type ${singularName} is not registered in the cache store.`);

        const { cache, pluralName, apiPrefix } = typeRegistry;

        cache.update((current: { [x: string]: T }) => ({
            ...current,
            [id]: { ...current[id], state: 'updating', error: false, errorMessage: null },
        }));

        try {
            const response = await fetch(`${apiPrefix}/${pluralName}/${id}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ [singularName]: item }),
            });

            if (!response.ok) throw new Error(`Failed to update: ${response.statusText}`);

            const json = await response.json();
            handleSideLoading(singularName, pluralName, json);

            const updatedItem = json[singularName] as T;
            updatedItem.state = 'loaded';
            updatedItem.error = false;
            updatedItem.errorMessage = null;

            cache.update((current: any) => ({
                ...current,
                [updatedItem.id]: updatedItem,
            }));
        } catch (error) {
            let errorMessage = 'An unknown error occurred';
            if (isErrorWithMessage(error)) {
                errorMessage = error.message;
            }
            cache.update((current: { [x: string]: T }) => ({
                ...current,
                [id]: { ...current[id], state: 'error', error: true, errorMessage },
            }));
            console.error(`Failed to update ${id}:`, errorMessage);
        }
    }

    /**
     * Remove an item by its ID.
     * @param singularName
     * @param id
     */
    async function remove<T extends CacheItem>(singularName: string, id: string): Promise<void> {
        const typeRegistry = registry.get(singularName) as CacheRegistry<T>;
        if (!typeRegistry)
            throw new Error(`Type ${singularName} is not registered in the cache store.`);

        const { cache, pluralName, apiPrefix } = typeRegistry;

        cache.update((current: { [x: string]: T }) => ({
            ...current,
            [id]: { ...current[id], state: 'deleting', error: false, errorMessage: null },
        }));

        try {
            const response = await fetch(`${apiPrefix}/${pluralName}/${id}`, {
                method: 'DELETE',
            });

            if (!response.ok) throw new Error(`Failed to delete: ${response.statusText}`);

            cache.update((current: { [x: string]: T }) => {
                const { [id]: _, ...rest } = current;
                return rest;
            });
        } catch (error) {
            let errorMessage = 'An unknown error occurred';
            if (isErrorWithMessage(error)) {
                errorMessage = error.message;
            }
            cache.update((current: { [x: string]: T }) => ({
                ...current,
                [id]: { ...current[id], state: 'error', error: true, errorMessage },
            }));
            console.error(`Failed to delete ${id}:`, errorMessage);
        }
    }

    return {
        registerType,
        fetchById,
        fetchAll,
        reloadById,
        reloadAll,
        create,
        update,
        remove,
        getCache,
    };
}
