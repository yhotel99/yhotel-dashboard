"use client";

import { useState, useCallback } from "react";

export interface UseDialogStateReturn<T> {
  isCreateOpen: boolean;
  isEditOpen: boolean;
  selectedItem: T | null;
  openCreate: () => void;
  closeCreate: () => void;
  openEdit: (item: T) => void;
  closeEdit: () => void;
  reset: () => void;
}

/**
 * Hook to manage create/edit dialog state
 */
export function useDialogState<T>(): UseDialogStateReturn<T> {
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState<T | null>(null);

  const openCreate = useCallback(() => {
    setIsCreateOpen(true);
  }, []);

  const closeCreate = useCallback(() => {
    setIsCreateOpen(false);
  }, []);

  const openEdit = useCallback((item: T) => {
    setSelectedItem(item);
    setIsEditOpen(true);
  }, []);

  const closeEdit = useCallback(() => {
    setIsEditOpen(false);
    setSelectedItem(null);
  }, []);

  const reset = useCallback(() => {
    setIsCreateOpen(false);
    setIsEditOpen(false);
    setSelectedItem(null);
  }, []);

  return {
    isCreateOpen,
    isEditOpen,
    selectedItem,
    openCreate,
    closeCreate,
    openEdit,
    closeEdit,
    reset,
  };
}
