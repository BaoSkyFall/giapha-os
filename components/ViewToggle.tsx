"use client";

import { motion } from "framer-motion";
import { List, ListTree, Network } from "lucide-react";
import { useDashboard } from "./DashboardContext";

export type ViewMode = "list" | "tree" | "mindmap";

export default function ViewToggle() {
  const { view: currentView, setView } = useDashboard();

  const tabs = [
    {
      id: "list",
      label: "Danh sách",
      icon: <List className="size-4" />,
    },
    {
      id: "tree",
      label: "Sơ đồ cây",
      icon: <Network className="size-4" />,
    },
    {
      id: "mindmap",
      label: "Mindmap",
      icon: <ListTree className="size-4" />,
    },
  ] as const;

  return (
    <div className="flex bg-altar-wood/5 p-1 rounded-lg w-fit relative border border-heritage-gold/10">
      {tabs.map((tab) => {
        const isActive = currentView === tab.id;
        return (
          <button
            key={tab.id}
            onClick={() => setView(tab.id as ViewMode)}
            className={`relative px-3 py-1.5 text-xs font-semibold rounded-md transition-colors duration-300 ease-in-out z-10 flex items-center gap-1.5 ${isActive
                ? "text-heritage-red"
                : "text-altar-wood/50 hover:text-heritage-red/70"
              }`}
          >
            {isActive && (
              <motion.div
                layoutId="activeTab"
                className="absolute inset-0 bg-white rounded-md shadow-sm border border-heritage-gold/10 z-[-1]"
                transition={{ type: "spring", stiffness: 450, damping: 30 }}
              />
            )}
            <span
              className={`transition-colors duration-300 ${isActive ? "text-heritage-red" : "text-altar-wood/30"}`}
            >
              {tab.icon}
            </span>
            <span className="tracking-wide">{tab.label}</span>
          </button>
        );
      })}
    </div>
  );
}
