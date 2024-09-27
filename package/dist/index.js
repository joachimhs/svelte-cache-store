"use strict";
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __defNormalProp = (obj, key, value) => key in obj ? __defProp(obj, key, { enumerable: true, configurable: true, writable: true, value }) : obj[key] = value;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);
var __publicField = (obj, key, value) => {
  __defNormalProp(obj, typeof key !== "symbol" ? key + "" : key, value);
  return value;
};

// src/index.ts
var src_exports = {};
__export(src_exports, {
  cacheStore: () => cacheStore
});
module.exports = __toCommonJS(src_exports);

// node_modules/svelte/src/runtime/internal/utils.js
function noop() {
}
function safe_not_equal(a, b) {
  return a != a ? b == b : a !== b || a && typeof a === "object" || typeof a === "function";
}
function subscribe(store, ...callbacks) {
  if (store == null) {
    for (const callback of callbacks) {
      callback(void 0);
    }
    return noop;
  }
  const unsub = store.subscribe(...callbacks);
  return unsub.unsubscribe ? () => unsub.unsubscribe() : unsub;
}
function get_store_value(store) {
  let value;
  subscribe(store, (_) => value = _)();
  return value;
}

// node_modules/svelte/src/runtime/internal/globals.js
var globals = typeof window !== "undefined" ? window : typeof globalThis !== "undefined" ? globalThis : (
  // @ts-ignore Node typings have this
  global
);

// node_modules/svelte/src/runtime/internal/ResizeObserverSingleton.js
var ResizeObserverSingleton = class {
  /** @param {ResizeObserverOptions} options */
  constructor(options) {
    /**
     * @private
     * @readonly
     * @type {WeakMap<Element, import('./private.js').Listener>}
     */
    __publicField(this, "_listeners", "WeakMap" in globals ? /* @__PURE__ */ new WeakMap() : void 0);
    /**
     * @private
     * @type {ResizeObserver}
     */
    __publicField(this, "_observer");
    /** @type {ResizeObserverOptions} */
    __publicField(this, "options");
    this.options = options;
  }
  /**
   * @param {Element} element
   * @param {import('./private.js').Listener} listener
   * @returns {() => void}
   */
  observe(element2, listener) {
    this._listeners.set(element2, listener);
    this._getObserver().observe(element2, this.options);
    return () => {
      this._listeners.delete(element2);
      this._observer.unobserve(element2);
    };
  }
  /**
   * @private
   */
  _getObserver() {
    var _a;
    return (_a = this._observer) != null ? _a : this._observer = new ResizeObserver((entries) => {
      var _a2;
      for (const entry of entries) {
        ResizeObserverSingleton.entries.set(entry.target, entry);
        (_a2 = this._listeners.get(entry.target)) == null ? void 0 : _a2(entry);
      }
    });
  }
};
ResizeObserverSingleton.entries = "WeakMap" in globals ? /* @__PURE__ */ new WeakMap() : void 0;

// node_modules/svelte/src/runtime/internal/dom.js
function insert(target, node, anchor) {
  target.insertBefore(node, anchor || null);
}
function detach(node) {
  if (node.parentNode) {
    node.parentNode.removeChild(node);
  }
}
function element(name) {
  return document.createElement(name);
}
function attr(node, attribute, value) {
  if (value == null)
    node.removeAttribute(attribute);
  else if (node.getAttribute(attribute) !== value)
    node.setAttribute(attribute, value);
}
function get_custom_elements_slots(element2) {
  const result = {};
  element2.childNodes.forEach(
    /** @param {Element} node */
    (node) => {
      result[node.slot || "default"] = true;
    }
  );
  return result;
}

// node_modules/svelte/src/shared/boolean_attributes.js
var _boolean_attributes = (
  /** @type {const} */
  [
    "allowfullscreen",
    "allowpaymentrequest",
    "async",
    "autofocus",
    "autoplay",
    "checked",
    "controls",
    "default",
    "defer",
    "disabled",
    "formnovalidate",
    "hidden",
    "inert",
    "ismap",
    "loop",
    "multiple",
    "muted",
    "nomodule",
    "novalidate",
    "open",
    "playsinline",
    "readonly",
    "required",
    "reversed",
    "selected"
  ]
);
var boolean_attributes = /* @__PURE__ */ new Set([..._boolean_attributes]);

// node_modules/svelte/src/runtime/internal/Component.js
var SvelteElement;
if (typeof HTMLElement === "function") {
  SvelteElement = class extends HTMLElement {
    constructor($$componentCtor, $$slots, use_shadow_dom) {
      super();
      /** The Svelte component constructor */
      __publicField(this, "$$ctor");
      /** Slots */
      __publicField(this, "$$s");
      /** The Svelte component instance */
      __publicField(this, "$$c");
      /** Whether or not the custom element is connected */
      __publicField(this, "$$cn", false);
      /** Component props data */
      __publicField(this, "$$d", {});
      /** `true` if currently in the process of reflecting component props back to attributes */
      __publicField(this, "$$r", false);
      /** @type {Record<string, CustomElementPropDefinition>} Props definition (name, reflected, type etc) */
      __publicField(this, "$$p_d", {});
      /** @type {Record<string, Function[]>} Event listeners */
      __publicField(this, "$$l", {});
      /** @type {Map<Function, Function>} Event listener unsubscribe functions */
      __publicField(this, "$$l_u", /* @__PURE__ */ new Map());
      this.$$ctor = $$componentCtor;
      this.$$s = $$slots;
      if (use_shadow_dom) {
        this.attachShadow({ mode: "open" });
      }
    }
    addEventListener(type, listener, options) {
      this.$$l[type] = this.$$l[type] || [];
      this.$$l[type].push(listener);
      if (this.$$c) {
        const unsub = this.$$c.$on(type, listener);
        this.$$l_u.set(listener, unsub);
      }
      super.addEventListener(type, listener, options);
    }
    removeEventListener(type, listener, options) {
      super.removeEventListener(type, listener, options);
      if (this.$$c) {
        const unsub = this.$$l_u.get(listener);
        if (unsub) {
          unsub();
          this.$$l_u.delete(listener);
        }
      }
    }
    async connectedCallback() {
      this.$$cn = true;
      if (!this.$$c) {
        let create_slot = function(name) {
          return () => {
            let node;
            const obj = {
              c: function create() {
                node = element("slot");
                if (name !== "default") {
                  attr(node, "name", name);
                }
              },
              /**
               * @param {HTMLElement} target
               * @param {HTMLElement} [anchor]
               */
              m: function mount(target, anchor) {
                insert(target, node, anchor);
              },
              d: function destroy(detaching) {
                if (detaching) {
                  detach(node);
                }
              }
            };
            return obj;
          };
        };
        await Promise.resolve();
        if (!this.$$cn || this.$$c) {
          return;
        }
        const $$slots = {};
        const existing_slots = get_custom_elements_slots(this);
        for (const name of this.$$s) {
          if (name in existing_slots) {
            $$slots[name] = [create_slot(name)];
          }
        }
        for (const attribute of this.attributes) {
          const name = this.$$g_p(attribute.name);
          if (!(name in this.$$d)) {
            this.$$d[name] = get_custom_element_value(name, attribute.value, this.$$p_d, "toProp");
          }
        }
        for (const key in this.$$p_d) {
          if (!(key in this.$$d) && this[key] !== void 0) {
            this.$$d[key] = this[key];
            delete this[key];
          }
        }
        this.$$c = new this.$$ctor({
          target: this.shadowRoot || this,
          props: {
            ...this.$$d,
            $$slots,
            $$scope: {
              ctx: []
            }
          }
        });
        const reflect_attributes = () => {
          this.$$r = true;
          for (const key in this.$$p_d) {
            this.$$d[key] = this.$$c.$$.ctx[this.$$c.$$.props[key]];
            if (this.$$p_d[key].reflect) {
              const attribute_value = get_custom_element_value(
                key,
                this.$$d[key],
                this.$$p_d,
                "toAttribute"
              );
              if (attribute_value == null) {
                this.removeAttribute(this.$$p_d[key].attribute || key);
              } else {
                this.setAttribute(this.$$p_d[key].attribute || key, attribute_value);
              }
            }
          }
          this.$$r = false;
        };
        this.$$c.$$.after_update.push(reflect_attributes);
        reflect_attributes();
        for (const type in this.$$l) {
          for (const listener of this.$$l[type]) {
            const unsub = this.$$c.$on(type, listener);
            this.$$l_u.set(listener, unsub);
          }
        }
        this.$$l = {};
      }
    }
    // We don't need this when working within Svelte code, but for compatibility of people using this outside of Svelte
    // and setting attributes through setAttribute etc, this is helpful
    attributeChangedCallback(attr2, _oldValue, newValue) {
      var _a;
      if (this.$$r)
        return;
      attr2 = this.$$g_p(attr2);
      this.$$d[attr2] = get_custom_element_value(attr2, newValue, this.$$p_d, "toProp");
      (_a = this.$$c) == null ? void 0 : _a.$set({ [attr2]: this.$$d[attr2] });
    }
    disconnectedCallback() {
      this.$$cn = false;
      Promise.resolve().then(() => {
        if (!this.$$cn && this.$$c) {
          this.$$c.$destroy();
          this.$$c = void 0;
        }
      });
    }
    $$g_p(attribute_name) {
      return Object.keys(this.$$p_d).find(
        (key) => this.$$p_d[key].attribute === attribute_name || !this.$$p_d[key].attribute && key.toLowerCase() === attribute_name
      ) || attribute_name;
    }
  };
}
function get_custom_element_value(prop, value, props_definition, transform) {
  var _a;
  const type = (_a = props_definition[prop]) == null ? void 0 : _a.type;
  value = type === "Boolean" && typeof value !== "boolean" ? value != null : value;
  if (!transform || !props_definition[prop]) {
    return value;
  } else if (transform === "toAttribute") {
    switch (type) {
      case "Object":
      case "Array":
        return value == null ? null : JSON.stringify(value);
      case "Boolean":
        return value ? "" : null;
      case "Number":
        return value == null ? null : value;
      default:
        return value;
    }
  } else {
    switch (type) {
      case "Object":
      case "Array":
        return value && JSON.parse(value);
      case "Boolean":
        return value;
      case "Number":
        return value != null ? +value : value;
      default:
        return value;
    }
  }
}

// node_modules/svelte/src/runtime/store/index.js
var subscriber_queue = [];
function writable(value, start = noop) {
  let stop;
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
    set(fn(value));
  }
  function subscribe2(run2, invalidate = noop) {
    const subscriber = [run2, invalidate];
    subscribers.add(subscriber);
    if (subscribers.size === 1) {
      stop = start(set, update) || noop;
    }
    run2(value);
    return () => {
      subscribers.delete(subscriber);
      if (subscribers.size === 0 && stop) {
        stop();
        stop = null;
      }
    };
  }
  return { set, update, subscribe: subscribe2 };
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
    registry.set(singularName, { cache, singularName, pluralName, apiPrefix, hasFetchedAll: false });
  }
  function getCache(typeName) {
    var _a;
    return (_a = registry.get(typeName)) == null ? void 0 : _a.cache;
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
  async function fetchById(singularName, id) {
    const typeRegistry = registry.get(singularName);
    if (!typeRegistry)
      throw new Error(`Type ${singularName} is not registered in the cache store.`);
    const { cache, pluralName, apiPrefix } = typeRegistry;
    let cacheValue = get_store_value(cache)[id];
    if (!cacheValue || cacheValue != null && cacheValue.state === "error") {
      cacheValue = { data: null, state: "loading", error: false, errorMessage: null };
      cache.update((current) => ({ ...current, [id]: cacheValue }));
      try {
        const response = await fetch(`${apiPrefix}/${pluralName}/${id}`);
        if (!response.ok)
          throw new Error(`Failed to fetch: ${response.statusText}`);
        const json = await response.json();
        handleSideLoading(singularName, pluralName, json);
        cacheValue = { data: json[singularName], state: "loaded", error: false, errorMessage: null };
        cache.update((current) => ({ ...current, [id]: cacheValue }));
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
    }
    return cacheValue;
  }
  async function fetchAll(singularName, sortColumns) {
    const typeRegistry = registry.get(singularName);
    if (!typeRegistry)
      throw new Error(`Type ${singularName} is not registered in the cache store.`);
    const { cache, pluralName, apiPrefix, hasFetchedAll } = typeRegistry;
    let cacheValue = get_store_value(cache);
    if (hasFetchedAll) {
      return Object.values(cacheValue);
    }
    try {
      const response = await fetch(`${apiPrefix}/${pluralName}`);
      if (!response.ok)
        throw new Error(`Failed to fetch: ${response.statusText}`);
      const json = await response.json();
      handleSideLoading(singularName, pluralName, json);
      let items = json[pluralName];
      items = sortData(items, sortColumns);
      cacheValue = Object.fromEntries(
        // @ts-ignore
        items.map((item) => [item["id"], {
          data: item,
          state: "loaded",
          error: false,
          errorMessage: null
        }])
      );
      cache.set(cacheValue);
      typeRegistry.hasFetchedAll = true;
    } catch (error) {
      let errorMessage = "An unknown error occurred";
      if (isErrorWithMessage(error)) {
        errorMessage = error.message;
      }
      cache.set(Object.fromEntries(
        // @ts-ignore
        Object.keys(cacheValue).map((id) => [id, {
          // @ts-ignore
          ...cacheValue[id],
          state: "error",
          error: true,
          errorMessage
        }])
      ));
      console.error("Failed to fetch all:", errorMessage);
    }
    return Object.values(cacheValue);
  }
  function handleSideLoading(mainSingularKey, mainPluralKey, data) {
    for (let key of Object.keys(data)) {
      console.log(`checking for sideloading for key: ${key} for mainSingularKey: ${mainSingularKey} and mainPluralKey: ${mainPluralKey}`);
      console.log(data);
      let sideloadKey = null;
      for (let [singularName, registryValue] of registry) {
        if (registryValue.pluralName === key) {
          sideloadKey = singularName;
          break;
        }
      }
      console.log("found sideloadKey:", sideloadKey);
      if (key !== mainSingularKey && key !== mainPluralKey && sideloadKey !== null) {
        const { cache } = registry.get(sideloadKey);
        let sideLoadedData = data[key];
        if (Array.isArray(sideLoadedData)) {
          let sideLoadedCache = Object.fromEntries(
            sideLoadedData.map((item) => [item["id"], {
              data: item,
              state: "loaded",
              error: false,
              errorMessage: null
            }])
          );
          cache.update((current) => ({ ...current, ...sideLoadedCache }));
          console.log(`Side-loaded data '${key}' has been loaded.`);
          console.log(cache);
        } else {
          console.warn(`Expected an array for side-loaded data '${key}', but received`, sideLoadedData);
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
      cache.update((current) => ({
        ...current,
        [json[singularName].id]: { data: json[singularName], state: "loaded", error: false, errorMessage: null }
      }));
    } catch (error) {
      let errorMessage = "An unknown error occurred";
      if (isErrorWithMessage(error)) {
        errorMessage = error.message;
      }
      console.error("Failed to create item:", errorMessage);
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
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ [singularName]: item })
      });
      if (!response.ok)
        throw new Error(`Failed to update: ${response.statusText}`);
      const json = await response.json();
      handleSideLoading(singularName, pluralName, json);
      cache.update((current) => ({
        ...current,
        [json[singularName].id]: { data: json[singularName], state: "loaded", error: false, errorMessage: null }
      }));
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
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  cacheStore
});
//# sourceMappingURL=index.js.map