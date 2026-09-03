import "@testing-library/jest-dom";
import { cleanup } from "@testing-library/react";
import { afterEach } from "vitest";

if (!HTMLElement.prototype.hasPointerCapture) {
  Object.assign(HTMLElement.prototype, {
    hasPointerCapture: () => false,
    releasePointerCapture: () => undefined,
    setPointerCapture: () => undefined,
  });
}

if (!HTMLElement.prototype.scrollIntoView) {
  HTMLElement.prototype.scrollIntoView = () => undefined;
}

if (typeof window !== "undefined" && !window.matchMedia) {
  Object.defineProperty(window, "matchMedia", {
    writable: true,
    value: (query: string) => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: () => undefined,
      removeListener: () => undefined,
      addEventListener: () => undefined,
      removeEventListener: () => undefined,
      dispatchEvent: () => false,
    }),
  });
}

afterEach(() => {
  cleanup();
});
