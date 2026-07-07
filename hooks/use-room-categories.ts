"use client";

import { useMemo } from "react";
import { useSettings } from "@/hooks/use-settings";
import {
  getActiveRoomCategories,
  parseRoomCategories,
  sortRoomCategories,
} from "@/lib/room-categories";

export function useRoomCategories() {
  const { settings, isLoading, error, mutate } = useSettings();

  const categories = useMemo(
    () => sortRoomCategories(parseRoomCategories(settings?.room_categories)),
    [settings?.room_categories]
  );

  const activeCategories = useMemo(
    () => getActiveRoomCategories(categories),
    [categories]
  );

  return {
    categories,
    activeCategories,
    isLoading,
    error,
    mutate,
  };
}
