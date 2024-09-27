import { writable, get } from 'svelte/store';

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

interface CacheRegistry {
    cache: any;
    singularName: string;
    pluralName: string;
    apiPrefix: string;
    hasFetchedAll: boolean;
}

// Type guard to check if the error is an instance of Error
function isErrorWithMessage(error: unknown): error is { message: string } {
    return typeof error === 'object' && error !== null && 'message' in error && typeof (error as any).message === 'string';
}

export let cacheStore = createCacheStore();

/**
 * Create a cache store for fetching, creating, updating, and deleting items of a specific type adhering to the
 * simple-json-api specification
 */
function createCacheStore() {
    const registry = new Map<string, CacheRegistry>();

    /**
     * Register a type in the cache store. The type must be registered before any operations can be performed on it.
     * @param singularName
     * @param pluralName
     * @param apiPrefix
     */
    function registerType<T>(singularName: string, pluralName: string, apiPrefix: string) {
        const cache = writable<{ [id: string]: CacheItem<T> }>({});
        registry.set(singularName, { cache, singularName, pluralName, apiPrefix, hasFetchedAll: false });
    }

    function getCache(typeName: string) {
        return registry.get(typeName)?.cache;
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
     * Fetch an item by its ID. If the item is not in the cache, it will be fetched from the API via the provided
     * apiPrefix. An object with the id and status set to 'loading'  will be returned synchronously,
     * and the data will be fetched asynchronously.
     *
     * If the item is already in the cache, the cached value will be returned synchronously.
     *
     * Any side-loaded data will be added to the cache if it is not already present, given that the side-loaded data
     * is registered in the cache registry.
     * @param singularName
     * @param id
     */
    async function fetchById<T>(singularName: string, id: string): Promise<CacheItem<T>> {
        const typeRegistry : CacheRegistry | undefined = registry.get(singularName);
        if (!typeRegistry) throw new Error(`Type ${singularName} is not registered in the cache store.`);

        const { cache, pluralName, apiPrefix } = typeRegistry;
        // @ts-ignore
        let cacheValue = get(cache)[id];

        if (!cacheValue || (cacheValue != null && cacheValue.state === 'error')) {
            cacheValue = { data: null, state: 'loading', error: false, errorMessage: null };
            cache.update((current: any) => ({ ...current, [id]: cacheValue }));

            try {
                const response = await fetch(`${apiPrefix}/${pluralName}/${id}`);
                if (!response.ok) throw new Error(`Failed to fetch: ${response.statusText}`);

                const json = await response.json();
                handleSideLoading(singularName, pluralName, json);
                cacheValue = { data: json[singularName], state: 'loaded', error: false, errorMessage: null };
                cache.update((current: any) => ({ ...current, [id]: cacheValue }));
            } catch (error) {
                let errorMessage = 'An unknown error occurred';
                if (isErrorWithMessage(error)) {
                    errorMessage = error.message;
                }
                cache.update((current: any) => ({
                    ...current,
                    [id]: { ...cacheValue, state: 'error', error: true, errorMessage }
                }));
                console.error(`Failed to fetch ${id}:`, errorMessage);
            }
        }

        return cacheValue;
    }

    /**
     * Fetch all items of a specific type. If the items are not in the cache, they will be fetched from the API via the
     * provided apiPrefix. An empty array will be returned synchronously, and the data will be fetched asynchronously.
     *
     * If the items are already in the cache, the cached values will be returned synchronously.
     *
     * Any side-loaded data will be added to the cache if it is not already present, given that the side-loaded data
     * is registered in the cache registry.
     * @param singularName
     * @param sortColumns
     */
    async function fetchAll<T>(singularName: string, sortColumns?: SortColumn[]): Promise<CacheItem<T>[]> {
        const typeRegistry: CacheRegistry | undefined = registry.get(singularName);
        if (!typeRegistry) throw new Error(`Type ${singularName} is not registered in the cache store.`);

        const { cache, pluralName, apiPrefix, hasFetchedAll } = typeRegistry;
        let cacheValue = get(cache);

        if (hasFetchedAll) {
            // @ts-ignore
            return Object.values(cacheValue);
        }

        try {
            const response = await fetch(`${apiPrefix}/${pluralName}`);
            if (!response.ok) throw new Error(`Failed to fetch: ${response.statusText}`);

            const json = await response.json();
            handleSideLoading(singularName, pluralName, json);

            let items = json[pluralName] as T[];
            items = sortData(items, sortColumns);


            cacheValue = Object.fromEntries(
                // @ts-ignore
                items.map((item: T) => [item['id'], {
                    data: item,
                    state: 'loaded',
                    error: false,
                    errorMessage: null
                }])
            );
            cache.set(cacheValue);

            // Mark this data as having been fetched
            typeRegistry.hasFetchedAll = true;
        } catch (error) {
            let errorMessage = 'An unknown error occurred';
            if (isErrorWithMessage(error)) {
                errorMessage = error.message;
            }

            cache.set(Object.fromEntries(
                // @ts-ignore
                Object.keys(cacheValue).map(id => [id, {
                    // @ts-ignore
                    ...cacheValue[id],
                    state: 'error',
                    error: true,
                    errorMessage
                }])
            ));
            console.error('Failed to fetch all:', errorMessage);
        }

        // @ts-ignore
        return Object.values(cacheValue);
    }

    /**
     * Handle side-loading of data. If the data contains any side-loaded data, it will be added to the cache if it is not
     * already present, given that the side-loaded data is registered in the cache registry.
     *
     * @param mainSingularKey
     * @param mainPluralKey
     * @param data
     */
    function handleSideLoading(mainSingularKey: string, mainPluralKey: string, data: any) {
        for (let key of Object.keys(data)) {
            console.log(`checking for sideloading for key: ${key} for mainSingularKey: ${mainSingularKey} and mainPluralKey: ${mainPluralKey}`);
            console.log(data);
            //iterate synchronously over values in registry and find the key that matches the pluralName
            let sideloadKey = null;
            for (let [singularName, registryValue] of registry) {
                if (registryValue.pluralName === key) {
                    sideloadKey = singularName;
                    break;
                }
            }

            console.log('found sideloadKey:', sideloadKey);

            if (key !== mainSingularKey && key !== mainPluralKey && sideloadKey !== null) {
                // @ts-ignore
                const { cache } = registry.get(sideloadKey);
                let sideLoadedData = data[key];

                // Check if sideLoadedData exists and is an array
                if (Array.isArray(sideLoadedData)) {
                    let sideLoadedCache = Object.fromEntries(
                        sideLoadedData.map((item: any) => [item['id'], {
                            data: item,
                            state: 'loaded',
                            error: false,
                            errorMessage: null
                        }])
                    );

                    // Update the cache for the side-loaded data type
                    cache.update((current: any) => ({ ...current, ...sideLoadedCache }));
                    console.log(`Side-loaded data '${key}' has been loaded.`);
                    console.log(cache);
                } else {
                    console.warn(`Expected an array for side-loaded data '${key}', but received`, sideLoadedData);
                }
            }
        }
    }

    /**
     * Reload an item by its ID. The item will be re-fetched from the API via the provided apiPrefix, even if it is already
     * in the cache. The re-fetched item will replace the existing item in the cache.
     * @param singularName
     * @param id
     */
    async function reloadById<T>(singularName: string, id: string): Promise<CacheItem<T>> {
        const typeRegistry : CacheRegistry | undefined = registry.get(singularName);
        if (!typeRegistry) throw new Error(`Type ${singularName} is not registered in the cache store.`);

        const { cache } = typeRegistry;
        cache.update((current: { [x: string]: any; }) => {
            const { [id]: _, ...rest } = current;
            return rest;
        });
        return await fetchById(singularName, id);
    }

    /**
     * Reload all items of a specific type. The items will be re-fetched from the API via the provided apiPrefix, even if
     * they are already in the cache. The re-fetched items will replace the existing items in the cache.
     *
     * @param singularName
     * @param sortColumns
     */
    async function reloadAll<T>(singularName: string, sortColumns?: SortColumn[]): Promise<CacheItem<T>[]> {
        const typeRegistry : CacheRegistry | undefined = registry.get(singularName);
        if (!typeRegistry) throw new Error(`Type ${singularName} is not registered in the cache store.`);

        const { cache } = typeRegistry;
        cache.set({});  // Invalidate all cache

        // Reset the hasFetchedAll flag before re-fetching
        typeRegistry.hasFetchedAll = false;

        return await fetchAll(singularName, sortColumns);
    }

    /**
     * Create a new item. The item will be created via the API using the provided apiPrefix. The created item will be
     * added to the cache.
     *
     * @param singularName
     * @param item
     */
    async function create<T>(singularName: string, item: T): Promise<void> {
        const typeRegistry : CacheRegistry | undefined = registry.get(singularName);
        if (!typeRegistry) throw new Error(`Type ${singularName} is not registered in the cache store.`);

        const { cache,  pluralName, apiPrefix } = typeRegistry;

        try {
            const response = await fetch(`${apiPrefix}/${pluralName}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ [singularName]: item }),
            });

            if (!response.ok) throw new Error(`Failed to create: ${response.statusText}`);

            const json = await response.json();
            handleSideLoading(singularName, pluralName, json);

            cache.update((current: any) => ({
                ...current,
                [json[singularName].id]: { data: json[singularName], state: 'loaded', error: false, errorMessage: null }
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
     * Update an item by its ID. The item will be updated via the API using the provided apiPrefix. The updated item will
     * be added to the cache.
     * @param singularName
     * @param id
     * @param item
     */
    async function update<T>(singularName: string, id: string, item: Partial<T>): Promise<void> {
        const typeRegistry : CacheRegistry | undefined = registry.get(singularName);
        if (!typeRegistry) throw new Error(`Type ${singularName} is not registered in the cache store.`);

        const { cache, pluralName, apiPrefix } = typeRegistry;

        cache.update((current: { [x: string]: any; }) => ({
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

            cache.update((current: any) => ({
                ...current,
                [json[singularName].id]: { data: json[singularName], state: 'loaded', error: false, errorMessage: null }
            }));
        } catch (error) {
            let errorMessage = 'An unknown error occurred';
            if (isErrorWithMessage(error)) {
                errorMessage = error.message;
            }
            cache.update((current: { [x: string]: any; }) => ({
                ...current,
                [id]: { ...current[id], state: 'error', error: true, errorMessage }
            }));
            console.error(`Failed to update ${id}:`, errorMessage);
        }
    }

    /**
     * Remove an item by its ID. The item will be removed via the API using the provided apiPrefix. The item will be
     * removed from the cache.
     *
     * @param singularName
     * @param id
     */
    async function remove<T>(singularName: string, id: string): Promise<void> {
        const typeRegistry : CacheRegistry | undefined = registry.get(singularName);
        if (!typeRegistry) throw new Error(`Type ${singularName} is not registered in the cache store.`);

        const { cache, pluralName, apiPrefix } = typeRegistry;

        cache.update((current: { [x: string]: any; }) => ({
            ...current,
            [id]: { ...current[id], state: 'deleting', error: false, errorMessage: null },
        }));

        try {
            const response = await fetch(`${apiPrefix}/${pluralName}/${id}`, {
                method: 'DELETE',
            });

            if (!response.ok) throw new Error(`Failed to delete: ${response.statusText}`);

            cache.update((current: { [x: string]: any; }) => {
                const { [id]: _, ...rest } = current;
                return rest;
            });
        } catch (error) {
            let errorMessage = 'An unknown error occurred';
            if (isErrorWithMessage(error)) {
                errorMessage = error.message;
            }
            cache.update((current: { [x: string]: any; }) => ({
                ...current,
                [id]: { ...current[id], state: 'error', error: true, errorMessage }
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
