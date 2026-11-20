import type { ComponentType } from "react";

/*
 * Every example in ./examples, twice: as a component to render and as its
 * source text for the Code tab. Both come from the same file, so the preview
 * and the code always match.
 */
const modules = import.meta.glob<{ default: ComponentType }>("./examples/*.tsx", { eager: true });
const sources = import.meta.glob<string>("./examples/*.tsx", { eager: true, query: "?raw", import: "default" });

export interface LoadedExample {
  Component: ComponentType;
  code: string;
}

export function loadExample(file: string): LoadedExample | null {
  const path = `./examples/${file}.tsx`;
  const module = modules[path];
  const code = sources[path];
  if (!module || code == null) return null;
  return { Component: module.default, code: code.trimEnd() };
}
