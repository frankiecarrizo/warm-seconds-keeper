import { useEffect, useRef, useState, useCallback } from "react";
import { createSwapy, type Swapy, type SlotItemMapArray } from "swapy";

export interface WidgetConfig {
  id: string;
  label: string;
  visible: boolean;
}

interface UseSwapyOptions {
  storageKey: string;
  defaultWidgets: WidgetConfig[];
  animation?: "dynamic" | "spring" | "none";
  enabled?: boolean;
}

function loadFromStorage(key: string): { order: string[]; hidden: string[] } | null {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function saveToStorage(key: string, order: string[], hidden: string[]) {
  localStorage.setItem(key, JSON.stringify({ order, hidden }));
}

export function useSwapy({ storageKey, defaultWidgets, animation = "dynamic", enabled = true }: UseSwapyOptions) {
  const containerRef = useRef<HTMLDivElement>(null);
  const swapyRef = useRef<Swapy | null>(null);

  const stored = loadFromStorage(storageKey);

  const [widgets, setWidgets] = useState<WidgetConfig[]>(() => {
    if (stored) {
      const widgetMap = new Map(defaultWidgets.map((w) => [w.id, w]));
      const ordered: WidgetConfig[] = [];
      // First add stored order
      for (const id of stored.order) {
        const w = widgetMap.get(id);
        if (w) {
          ordered.push({ ...w, visible: !stored.hidden.includes(id) });
          widgetMap.delete(id);
        }
      }
      // Add any new widgets not in storage
      for (const w of widgetMap.values()) {
        ordered.push(w);
      }
      return ordered;
    }
    return defaultWidgets;
  });

  const persist = useCallback(
    (ws: WidgetConfig[]) => {
      saveToStorage(
        storageKey,
        ws.map((w) => w.id),
        ws.filter((w) => !w.visible).map((w) => w.id)
      );
    },
    [storageKey]
  );

  // Initialize swapy
  useEffect(() => {
    if (!enabled || !containerRef.current) return;

    // Small delay to ensure DOM is ready
    const timer = setTimeout(() => {
      if (!containerRef.current) return;
      try {
        swapyRef.current = createSwapy(containerRef.current, {
          animation,
          manualSwap: true,
        });

        swapyRef.current.onSwap((event: any) => {
          const arr = event?.data?.array || event?.array || [];
          const newOrder = arr
            .map((entry: any) => entry.item || entry.itemId)
            .filter(Boolean) as string[];

          setWidgets((prev) => {
            const map = new Map(prev.map((w) => [w.id, w]));
            const reordered = newOrder.map((id) => map.get(id)).filter(Boolean) as WidgetConfig[];
            // Add any not in swap (hidden ones)
            const reorderedIds = new Set(newOrder);
            for (const w of prev) {
              if (!reorderedIds.has(w.id)) {
                reordered.push(w);
              }
            }
            persist(reordered);
            return reordered;
          });
        });
      } catch (e) {
        console.warn("Swapy init error:", e);
      }
    }, 100);

    return () => {
      clearTimeout(timer);
      if (swapyRef.current) {
        swapyRef.current.destroy();
        swapyRef.current = null;
      }
    };
  }, [enabled, animation, widgets.filter((w) => w.visible).length]);

  const toggleWidget = useCallback(
    (id: string) => {
      setWidgets((prev) => {
        const next = prev.map((w) => (w.id === id ? { ...w, visible: !w.visible } : w));
        persist(next);
        // Destroy and reinit swapy when visibility changes
        if (swapyRef.current) {
          swapyRef.current.destroy();
          swapyRef.current = null;
        }
        return next;
      });
    },
    [persist]
  );

  const resetLayout = useCallback(() => {
    localStorage.removeItem(storageKey);
    if (swapyRef.current) {
      swapyRef.current.destroy();
      swapyRef.current = null;
    }
    setWidgets(defaultWidgets);
  }, [storageKey, defaultWidgets]);

  const showAll = useCallback(() => {
    setWidgets((prev) => {
      const next = prev.map((w) => ({ ...w, visible: true }));
      persist(next);
      if (swapyRef.current) {
        swapyRef.current.destroy();
        swapyRef.current = null;
      }
      return next;
    });
  }, [persist]);

  const visibleWidgets = widgets.filter((w) => w.visible);

  return {
    containerRef,
    widgets,
    visibleWidgets,
    toggleWidget,
    resetLayout,
    showAll,
  };
}
