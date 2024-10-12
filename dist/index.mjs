// node_modules/svelte/src/internal/shared/utils.js
var is_array = Array.isArray;
var array_from = Array.from;
var object_prototype = Object.prototype;
var array_prototype = Array.prototype;
var noop = () => {
};

// node_modules/svelte/src/internal/client/reactivity/equality.js
function safe_not_equal(a, b) {
  return a != a ? b == b : a !== b || a !== null && typeof a === "object" || typeof a === "function";
}

// node_modules/svelte/src/store/utils.js
function subscribe_to_store(store, run, invalidate) {
  if (store == null) {
    run(void 0);
    if (invalidate)
      invalidate(void 0);
    return noop;
  }
  const unsub = store.subscribe(
    run,
    // @ts-expect-error
    invalidate
  );
  return unsub.unsubscribe ? () => unsub.unsubscribe() : unsub;
}

// node_modules/svelte/src/store/shared/index.js
var subscriber_queue = [];
function writable(value, start = noop) {
  let stop = null;
  const subscribers = /* @__PURE__ */ new Set();
  function set(new_value) {
    if (safe_not_equal(value, new_value)) {
      value = new_value;
      if (stop) {
        const run_queue = !subscriber_queue.length;
        for (const subscriber of subscribers) {
          subscriber[1]();
          subscriber_queue.push(subscriber, value);
        }
        if (run_queue) {
          for (let i = 0; i < subscriber_queue.length; i += 2) {
            subscriber_queue[i][0](subscriber_queue[i + 1]);
          }
          subscriber_queue.length = 0;
        }
      }
    }
  }
  function update(fn) {
    set(fn(
      /** @type {T} */
      value
    ));
  }
  function subscribe(run, invalidate = noop) {
    const subscriber = [run, invalidate];
    subscribers.add(subscriber);
    if (subscribers.size === 1) {
      stop = start(set, update) || noop;
    }
    run(
      /** @type {T} */
      value
    );
    return () => {
      subscribers.delete(subscriber);
      if (subscribers.size === 0 && stop) {
        stop();
        stop = null;
      }
    };
  }
  return { set, update, subscribe };
}
function get(store) {
  let value;
  subscribe_to_store(store, (_) => value = _)();
  return value;
}

// src/index.ts
function isErrorWithMessage(error) {
  return typeof error === "object" && error !== null && "message" in error && typeof error.message === "string";
}
var cacheStore = createCacheStore();
function createCacheStore() {
  const registry = /* @__PURE__ */ new Map();
  function registerType(singularName, pluralName, apiPrefix) {
    const cache = writable({});
    registry.set(singularName, {
      cache,
      singularName,
      pluralName,
      apiPrefix,
      hasFetchedAll: false
    });
  }
  function getCache(singularName) {
    const registryEntry = registry.get(singularName);
    if (!registryEntry) {
      throw new Error(`Type ${singularName} is not registered in the cache store.`);
    }
    return registryEntry.cache;
  }
  function sortData(data, sortColumns) {
    if (!sortColumns || sortColumns.length === 0)
      return data;
    return data.sort((a, b) => {
      for (let sort of sortColumns) {
        const { sortColumn, sortOrder } = sort;
        const order = sortOrder == null ? void 0 : sortOrder.toLowerCase();
        const aValue = a[sortColumn];
        const bValue = b[sortColumn];
        if (aValue < bValue)
          return order === "desc" || order === "descending" ? 1 : -1;
        if (aValue > bValue)
          return order === "desc" || order === "descending" ? -1 : 1;
      }
      return 0;
    });
  }
  function createLazyLoadingProxy(singularName, item) {
    return new Proxy(item, {
      get(target, prop, receiver) {
        if (prop === "id" || prop === "state" || prop === "error" || prop === "errorMessage" || typeof prop === "symbol" || typeof target[prop] === "function") {
          return Reflect.get(target, prop, receiver);
        }
        if (target.state === "loaded") {
          return Reflect.get(target, prop, receiver);
        }
        if (target.state !== "loading") {
          target.state = "loading";
          cacheStore.fetchById(singularName, target.id).then((fullData) => {
            Object.assign(target, fullData);
            target.state = "loaded";
          }).catch((error) => {
            target.state = "error";
            target.error = true;
            target.errorMessage = error.message || "An unknown error occurred";
          });
        }
        return void 0;
      }
    });
  }
  function wrapRelatedPropertiesWithProxies(item) {
    return;
  }
  async function fetchById(singularName, id) {
    const typeRegistry = registry.get(singularName);
    if (!typeRegistry)
      throw new Error(`Type ${singularName} is not registered in the cache store.`);
    const { cache, pluralName, apiPrefix } = typeRegistry;
    let cacheValue = get(cache)[id];
    if (cacheValue && cacheValue.state === "loaded") {
      return cacheValue;
    }
    if (cacheValue && (cacheValue.state === "loading" || cacheValue.state === "error")) {
      return cacheValue;
    }
    if (!cacheValue) {
      cacheValue = {
        id,
        state: "loading",
        error: false,
        errorMessage: null
      };
      cache.update((current) => ({ ...current, [id]: cacheValue }));
    }
    try {
      const response = await fetch(`${apiPrefix}/${pluralName}/${id}`);
      if (!response.ok)
        throw new Error(`Failed to fetch: ${response.statusText}`);
      const json = await response.json();
      handleSideLoading(singularName, pluralName, json);
      const data = json[singularName];
      data.state = "loaded";
      data.error = false;
      data.errorMessage = null;
      wrapRelatedPropertiesWithProxies(data);
      cache.update((current) => ({ ...current, [id]: data }));
      cacheValue = data;
    } catch (error) {
      let errorMessage = "An unknown error occurred";
      if (isErrorWithMessage(error)) {
        errorMessage = error.message;
      }
      cache.update((current) => ({
        ...current,
        [id]: { ...cacheValue, state: "error", error: true, errorMessage }
      }));
      console.error(`Failed to fetch ${id}:`, errorMessage);
    }
    return cacheValue;
  }
  async function fetchAll(singularName, sortColumns) {
    const typeRegistry = registry.get(singularName);
    if (!typeRegistry)
      throw new Error(`Type ${singularName} is not registered in the cache store.`);
    const { cache, pluralName, apiPrefix } = typeRegistry;
    if (typeRegistry.hasFetchedAll) {
      const cachedItems = Object.values(get(cache));
      return sortColumns ? sortData(cachedItems, sortColumns) : cachedItems;
    }
    try {
      const response = await fetch(`${apiPrefix}/${pluralName}`);
      if (!response.ok)
        throw new Error(`Failed to fetch: ${response.statusText}`);
      const json = await response.json();
      handleSideLoading(singularName, pluralName, json);
      let items = json[pluralName];
      items.forEach((item) => {
        item.state = "loaded";
        item.error = false;
        item.errorMessage = null;
        wrapRelatedPropertiesWithProxies(item);
      });
      const newCacheValue = Object.fromEntries(items.map((item) => [item.id, item]));
      cache.set(newCacheValue);
      typeRegistry.hasFetchedAll = true;
      return sortColumns ? sortData(items, sortColumns) : items;
    } catch (error) {
      let errorMessage = "An unknown error occurred";
      if (isErrorWithMessage(error)) {
        errorMessage = error.message;
      }
      cache.update((current) => {
        const updated = { ...current };
        Object.keys(updated).forEach((id) => {
          updated[id].state = "error";
          updated[id].error = true;
          updated[id].errorMessage = errorMessage;
        });
        return updated;
      });
      console.error("Failed to fetch all:", errorMessage);
      throw new Error(errorMessage);
    }
  }
  function handleSideLoading(mainSingularKey, mainPluralKey, data) {
    for (let key of Object.keys(data)) {
      let sideloadKey = null;
      for (let [singularName, registryValue] of registry) {
        if (registryValue.pluralName === key) {
          sideloadKey = singularName;
          break;
        }
      }
      if (key !== mainSingularKey && key !== mainPluralKey && sideloadKey !== null) {
        const registryEntry = registry.get(sideloadKey);
        const cache = registryEntry.cache;
        let sideLoadedData = data[key];
        if (Array.isArray(sideLoadedData)) {
          sideLoadedData.forEach((item) => {
            item.state = "loaded";
            item.error = false;
            item.errorMessage = null;
          });
          let sideLoadedCache = Object.fromEntries(
            sideLoadedData.map((item) => [item.id, item])
          );
          cache.update((current) => ({ ...current, ...sideLoadedCache }));
        } else {
          console.warn(
            `Expected an array for side-loaded data '${key}', but received`,
            sideLoadedData
          );
        }
      }
    }
  }
  async function reloadById(singularName, id) {
    const typeRegistry = registry.get(singularName);
    if (!typeRegistry)
      throw new Error(`Type ${singularName} is not registered in the cache store.`);
    const { cache } = typeRegistry;
    cache.update((current) => {
      const { [id]: _, ...rest } = current;
      return rest;
    });
    return await fetchById(singularName, id);
  }
  async function reloadAll(singularName, sortColumns) {
    const typeRegistry = registry.get(singularName);
    if (!typeRegistry)
      throw new Error(`Type ${singularName} is not registered in the cache store.`);
    const { cache } = typeRegistry;
    cache.set({});
    typeRegistry.hasFetchedAll = false;
    return await fetchAll(singularName, sortColumns);
  }
  async function create(singularName, item) {
    const typeRegistry = registry.get(singularName);
    if (!typeRegistry)
      throw new Error(`Type ${singularName} is not registered in the cache store.`);
    const { cache, pluralName, apiPrefix } = typeRegistry;
    try {
      const response = await fetch(`${apiPrefix}/${pluralName}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ [singularName]: item })
      });
      if (!response.ok)
        throw new Error(`Failed to create: ${response.statusText}`);
      const json = await response.json();
      handleSideLoading(singularName, pluralName, json);
      const newItem = json[singularName];
      newItem.state = "loaded";
      newItem.error = false;
      newItem.errorMessage = null;
      wrapRelatedPropertiesWithProxies(newItem);
      cache.update((current) => ({
        ...current,
        [newItem.id]: newItem
      }));
    } catch (error) {
      let errorMessage = "An unknown error occurred";
      if (isErrorWithMessage(error)) {
        errorMessage = error.message;
      }
      console.error("Failed to create item:", errorMessage);
      throw new Error(errorMessage);
    }
  }
  async function update(singularName, id, item) {
    const typeRegistry = registry.get(singularName);
    if (!typeRegistry)
      throw new Error(`Type ${singularName} is not registered in the cache store.`);
    const { cache, pluralName, apiPrefix } = typeRegistry;
    cache.update((current) => ({
      ...current,
      [id]: { ...current[id], state: "updating", error: false, errorMessage: null }
    }));
    try {
      const response = await fetch(`${apiPrefix}/${pluralName}/${id}`, {
        method: "PUT",
        // or 'PATCH' depending on your API
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ [singularName]: item })
      });
      if (!response.ok)
        throw new Error(`Failed to update: ${response.statusText}`);
      if (response.bodyUsed) {
        const json = await response.json();
        handleSideLoading(singularName, pluralName, json);
        const updatedItem = json[singularName];
        updatedItem.state = "loaded";
        updatedItem.error = false;
        updatedItem.errorMessage = null;
        wrapRelatedPropertiesWithProxies(updatedItem);
        cache.update((current) => ({
          ...current,
          [updatedItem.id]: updatedItem
        }));
      }
    } catch (error) {
      let errorMessage = "An unknown error occurred";
      if (isErrorWithMessage(error)) {
        errorMessage = error.message;
      }
      cache.update((current) => ({
        ...current,
        [id]: { ...current[id], state: "error", error: true, errorMessage }
      }));
      console.error(`Failed to update ${id}:`, errorMessage);
      throw new Error(errorMessage);
    }
  }
  async function remove(singularName, id) {
    const typeRegistry = registry.get(singularName);
    if (!typeRegistry)
      throw new Error(`Type ${singularName} is not registered in the cache store.`);
    const { cache, pluralName, apiPrefix } = typeRegistry;
    cache.update((current) => ({
      ...current,
      [id]: { ...current[id], state: "deleting", error: false, errorMessage: null }
    }));
    try {
      const response = await fetch(`${apiPrefix}/${pluralName}/${id}`, {
        method: "DELETE"
      });
      if (!response.ok)
        throw new Error(`Failed to delete: ${response.statusText}`);
      cache.update((current) => {
        const { [id]: _, ...rest } = current;
        return rest;
      });
    } catch (error) {
      let errorMessage = "An unknown error occurred";
      if (isErrorWithMessage(error)) {
        errorMessage = error.message;
      }
      cache.update((current) => ({
        ...current,
        [id]: { ...current[id], state: "error", error: true, errorMessage }
      }));
      console.error(`Failed to delete ${id}:`, errorMessage);
      throw new Error(errorMessage);
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
    getCache
  };
}
export {
  cacheStore
};
//# sourceMappingURL=index.mjs.map