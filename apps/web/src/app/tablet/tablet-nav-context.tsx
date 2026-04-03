"use client";

import { createContext, useContext } from "react";
import type { TabletNavConfig } from "@/lib/tabletNav";

export type TabletNavContextValue = {
  nav: TabletNavConfig | null;
  reloadNav: () => Promise<void>;
};

export const TabletNavContext = createContext<TabletNavContextValue>({
  nav: null,
  reloadNav: async () => {},
});

export function useTabletNav() {
  return useContext(TabletNavContext);
}
