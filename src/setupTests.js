// jest-dom adds custom jest matchers for asserting on DOM nodes.
// allows you to do things like:
// expect(element).toHaveTextContent(/react/i)
// learn more: https://github.com/testing-library/jest-dom
import '@testing-library/jest-dom/vitest';
import { afterEach } from "vitest";
import { cleanup } from "@testing-library/react";

// Newer Node versions define their own localStorage global, which is undefined
// without --localstorage-file and hides jsdom's. Give tests a working one.
if (typeof globalThis.localStorage === "undefined") {
  const store = new Map();
  Object.defineProperty(globalThis, "localStorage", {
    configurable: true,
    value: {
      getItem: (key) => (store.has(String(key)) ? store.get(String(key)) : null),
      setItem: (key, value) => void store.set(String(key), String(value)),
      removeItem: (key) => void store.delete(String(key)),
      clear: () => store.clear(),
      key: (index) => [...store.keys()][index] ?? null,
      get length() {
        return store.size;
      },
    },
  });
}

afterEach(() => {
  cleanup();
  sessionStorage.clear();
  localStorage.clear();
});
