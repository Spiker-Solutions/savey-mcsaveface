import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface UIState {
  // Selected budget
  selectedBudgetId: string | null;
  setSelectedBudgetId: (id: string | null) => void;

  // Modal states
  isCreateBudgetModalOpen: boolean;
  setCreateBudgetModalOpen: (open: boolean) => void;

  isCreateCategoryModalOpen: boolean;
  setCreateCategoryModalOpen: (open: boolean) => void;

  isCreateExpenseModalOpen: boolean;
  setCreateExpenseModalOpen: (open: boolean) => void;

  isInviteModalOpen: boolean;
  setInviteModalOpen: (open: boolean) => void;

  isDeleteConfirmModalOpen: boolean;
  deleteConfirmData: { type: string; id: string; name: string } | null;
  openDeleteConfirmModal: (type: string, id: string, name: string) => void;
  closeDeleteConfirmModal: () => void;

  // Expense filters
  expenseFilters: {
    categoryId: string | null;
    tagIds: string[];
    payeeId: string | null;
    dateRange: { start: Date | null; end: Date | null };
    searchQuery: string;
  };
  setExpenseFilter: <K extends keyof UIState['expenseFilters']>(
    key: K,
    value: UIState['expenseFilters'][K]
  ) => void;
  resetExpenseFilters: () => void;

  // Mobile navigation
  isMobileNavOpen: boolean;
  setMobileNavOpen: (open: boolean) => void;
}

const defaultExpenseFilters = {
  categoryId: null,
  tagIds: [],
  payeeId: null,
  dateRange: { start: null, end: null },
  searchQuery: '',
};

export const useUIStore = create<UIState>()((set) => ({
  // Selected budget
  selectedBudgetId: null,
  setSelectedBudgetId: (id) => set({ selectedBudgetId: id }),

  // Modal states
  isCreateBudgetModalOpen: false,
  setCreateBudgetModalOpen: (open) => set({ isCreateBudgetModalOpen: open }),

  isCreateCategoryModalOpen: false,
  setCreateCategoryModalOpen: (open) => set({ isCreateCategoryModalOpen: open }),

  isCreateExpenseModalOpen: false,
  setCreateExpenseModalOpen: (open) => set({ isCreateExpenseModalOpen: open }),

  isInviteModalOpen: false,
  setInviteModalOpen: (open) => set({ isInviteModalOpen: open }),

  isDeleteConfirmModalOpen: false,
  deleteConfirmData: null,
  openDeleteConfirmModal: (type, id, name) =>
    set({
      isDeleteConfirmModalOpen: true,
      deleteConfirmData: { type, id, name },
    }),
  closeDeleteConfirmModal: () =>
    set({
      isDeleteConfirmModalOpen: false,
      deleteConfirmData: null,
    }),

  // Expense filters
  expenseFilters: defaultExpenseFilters,
  setExpenseFilter: (key, value) =>
    set((state) => ({
      expenseFilters: { ...state.expenseFilters, [key]: value },
    })),
  resetExpenseFilters: () => set({ expenseFilters: defaultExpenseFilters }),

  // Mobile navigation
  isMobileNavOpen: false,
  setMobileNavOpen: (open) => set({ isMobileNavOpen: open }),
}));

// Theme store with persistence
interface ThemeState {
  colorScheme: 'light' | 'dark' | 'auto';
  setColorScheme: (scheme: 'light' | 'dark' | 'auto') => void;
}

export const useThemeStore = create<ThemeState>()(
  persist(
    (set) => ({
      colorScheme: 'auto',
      setColorScheme: (scheme) => set({ colorScheme: scheme }),
    }),
    {
      name: 'budget-theme',
    }
  )
);
