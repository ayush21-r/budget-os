import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useAuth } from './useAuth.js';
import {
  createCategory,
  createExpense,
  createNewMonth,
  deleteCategory,
  deleteExpense,
  deleteMonth,
  loadBudgetWorkspace,
  importWorkspace,
  resetAllUserData,
  updateCategory,
  updateExpense,
  updateMonth,
  updateSettings,
  createRecurringExpense,
  updateRecurringExpense,
  deleteRecurringExpense,
} from '../services/budgetService.js';

export function useBudgetWorkspace() {
  const { user } = useAuth();
  const [workspace, setWorkspace] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const activeMonthIdRef = useRef(null);

  const refresh = useCallback(async (preferredMonthId = activeMonthIdRef.current) => {
    if (!user?.id) return;

    setLoading(true);
    setError('');
    try {
      const data = await loadBudgetWorkspace(user.id, user, preferredMonthId);
      setWorkspace(data);
    } catch (workspaceError) {
      setError(workspaceError.message || 'Unable to load budget data.');
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const actions = useMemo(
    () => ({
      refresh,
      updatePlan: async (monthId, updates) => {
        await updateMonth(monthId, updates);
        await refresh();
      },
      createCategory: async (payload) => {
        await createCategory({ ...payload, userId: user.id });
        await refresh();
      },
      updateCategory: async (categoryId, payload) => {
        await updateCategory(categoryId, payload);
        await refresh();
      },
      deleteCategory: async (categoryId) => {
        await deleteCategory(categoryId);
        await refresh();
      },
      createExpense: async (payload) => {
        await createExpense({ ...payload, userId: user.id });
        await refresh();
      },
      updateExpense: async (expenseId, payload) => {
        await updateExpense(expenseId, payload);
        await refresh();
      },
      deleteExpense: async (expenseId) => {
        await deleteExpense(expenseId);
        await refresh();
      },
      selectMonth: async (monthId) => {
        activeMonthIdRef.current = monthId;
        await refresh(monthId);
      },
      createNewMonth: async () => {
        const data = await createNewMonth(user.id);
        activeMonthIdRef.current = data.id;
        await refresh(data.id);
      },
      deleteMonth: async (monthId) => {
        await deleteMonth(monthId);
        await refresh();
      },
      updateSettings: async (payload) => {
        await updateSettings(user.id, payload);
        await refresh();
      },
      resetAllData: async () => {
        await resetAllUserData(user.id);
        activeMonthIdRef.current = null;
        await refresh();
      },
      importWorkspace: async (workspace) => {
        await importWorkspace(user.id, workspace);
        activeMonthIdRef.current = workspace?.profile?.id || null;
        await refresh(activeMonthIdRef.current);
      },
      createRecurringExpense: async (payload) => {
        await createRecurringExpense({ ...payload, userId: user.id });
        await refresh();
      },
      updateRecurringExpense: async (id, payload) => {
        await updateRecurringExpense(id, payload);
        await refresh();
      },
      deleteRecurringExpense: async (id) => {
        await deleteRecurringExpense(id);
        await refresh();
      },
    }),
    [refresh, user?.id]
  );

  return {
    workspace,
    loading,
    error,
    actions,
  };
}
