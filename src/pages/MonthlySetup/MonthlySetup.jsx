import { Edit3, Plus, Trash2 } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import PageHeader from '../../components/PageHeader/PageHeader.jsx';
import Panel from '../../components/Panel/Panel.jsx';
import Button from '../../components/ui/Button/Button.jsx';
import Input from '../../components/ui/Input/Input.jsx';
import Modal from '../../components/ui/Modal/Modal.jsx';
import { usePageTitle } from '../../hooks/usePageTitle.js';
import { categoryIconOptions, getCategoryIcon } from '../../utils/categoryIcons.js';
import { formatCurrency } from '../../utils/formatters.js';
import styles from './MonthlySetup.module.css';

function MonthlySetup({ budgetState, actions, overview, isArchivedView }) {
  usePageTitle('Monthly Setup');

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState(null);
  const [categoryName, setCategoryName] = useState('');
  const [categoryBudget, setCategoryBudget] = useState('');
  const [categoryIcon, setCategoryIcon] = useState('wallet');
  const [allowance, setAllowance] = useState(String(budgetState.profile.allowance));
  const [savings_goal, setSavingsGoal] = useState(String(budgetState.profile.savings_goal));
  const [message, setMessage] = useState('');

  useEffect(() => {
    setAllowance(String(budgetState.profile.allowance));
    setSavingsGoal(String(budgetState.profile.savings_goal));
  }, [budgetState.profile.allowance, budgetState.profile.savings_goal]);

  const allocationPercent = useMemo(() => {
    return Math.min((overview.allocated / Math.max(overview.availableSpending, 1)) * 100, 100);
  }, [overview.availableSpending, overview.allocated]);

  function getAllocationMessage(unallocated = overview.unallocated) {
    if (unallocated < 0) return 'You have exceeded your budget.';
    if (unallocated > 0) return `You still have ${formatCurrency(unallocated)} left to allocate.`;
    return 'Your available spending is fully allocated.';
  }

  async function handlePlanUpdate(event) {
    event.preventDefault();
    const nextAllowance = Number(allowance);
    const nextSavings = Number(savings_goal);

    if (nextAllowance < 0 || nextSavings < 0) {
      setMessage('Monthly allowance and savings goal cannot be negative.');
      return;
    }
    if (nextSavings > nextAllowance) {
      setMessage('Savings goal cannot exceed monthly allowance.');
      return;
    }
    if (overview.allocated > nextAllowance - nextSavings) {
      setMessage('You have exceeded your budget.');
      return;
    }

    try {
      await actions.updatePlan(budgetState.profile.id, {
        allowance: nextAllowance,
        savings_goal: nextSavings,
      });
      setMessage('Monthly setup saved.');
    } catch (planError) {
      setMessage(planError.message || 'Unable to save monthly setup.');
    }
  }

  function resetCategoryForm() {
    setCategoryName('');
    setCategoryBudget('');
    setCategoryIcon('wallet');
    setEditingCategory(null);
    setMessage('');
  }

  function openEditCategory(category) {
    setEditingCategory(category);
    setCategoryName(category.name);
    setCategoryBudget(String(category.budget));
    setCategoryIcon(category.icon || 'wallet');
    setIsModalOpen(true);
  }

  async function handleAddCategory(event) {
    event.preventDefault();
    const trimmedName = categoryName.trim();
    const proposedBudget = Number(categoryBudget);

    if (!trimmedName || proposedBudget <= 0) {
      setMessage('Category name and budget are required.');
      return;
    }
    if (budgetState.categories.some((category) => category.name.toLowerCase() === trimmedName.toLowerCase() && category.id !== editingCategory?.id)) {
      setMessage('Duplicate category names are not allowed.');
      return;
    }

    const currentBudget = editingCategory ? Number(editingCategory.budget) : 0;
    const proposedAllocated = overview.allocated - currentBudget + proposedBudget;
    if (proposedAllocated > overview.availableSpending) {
      setMessage('You have exceeded your budget.');
      return;
    }

    try {
      if (editingCategory) {
        await actions.updateCategory(editingCategory.id, {
          name: trimmedName,
          budget: proposedBudget,
          icon: categoryIcon,
        });
      } else {
        await actions.createCategory({
          monthId: budgetState.profile.id,
          name: trimmedName,
          budget: proposedBudget,
          icon: categoryIcon,
        });
      }
      resetCategoryForm();
      setIsModalOpen(false);
    } catch (categoryError) {
      setMessage(categoryError.message || 'Unable to save category.');
    }
  }

  async function handleDeleteCategory(categoryId) {
    try {
      await actions.deleteCategory(categoryId);
      setMessage('Category deleted.');
    } catch (categoryError) {
      setMessage(categoryError.message || 'Unable to delete category.');
    }
  }

  return (
    <div className="pageFade">
      <PageHeader
        eyebrow="Monthly Setup"
        title="Shape the month before it starts."
        description={isArchivedView ? 'Archived setup is view-only.' : 'Set the allowance baseline, define savings intent, and keep category allocations visible.'}
        actions={!isArchivedView ? <Button icon={Plus} onClick={() => { resetCategoryForm(); setIsModalOpen(true); }}>Add Category</Button> : null}
      />

      <section className={styles.setupGrid}>
        <Panel title="Monthly Allowance" subtitle="Planning amount for the current cycle.">
          <form className={styles.planForm} onSubmit={handlePlanUpdate}>
            <div className={styles.metric}>
              <strong>{formatCurrency(budgetState.profile.allowance)}</strong>
              <span>Income planned for {budgetState.profile.month}</span>
            </div>
            {!isArchivedView ? <Input label="Monthly Allowance" id="monthly-allowance" type="number" min="0" value={allowance} onChange={(event) => setAllowance(event.target.value)} /> : null}
          </form>
        </Panel>
        <Panel title="Savings Goal" subtitle="Amount reserved before spending allocations.">
          <form className={styles.planForm} onSubmit={handlePlanUpdate}>
            <div className={styles.metric}>
              <strong>{formatCurrency(budgetState.profile.savings_goal)}</strong>
              <span>{Math.round((budgetState.profile.savings_goal / Math.max(budgetState.profile.allowance, 1)) * 100)}% of monthly allowance</span>
            </div>
            {!isArchivedView ? <Input label="Savings Goal" id="savings-goal" type="number" min="0" value={savings_goal} onChange={(event) => setSavingsGoal(event.target.value)} /> : null}
          </form>
        </Panel>
        <Panel title="Budget Allocation" subtitle="Category budgets compared with allowance.">
          <div className={styles.metric}>
            <strong>{formatCurrency(overview.allocated)}</strong>
            <span>{getAllocationMessage()}</span>
          </div>
          <div className={styles.allocationTrack}>
            <div style={{ width: `${allocationPercent}%` }} />
          </div>
          {!isArchivedView ? <Button type="button" className={styles.saveButton} onClick={handlePlanUpdate}>Save Setup</Button> : null}
        </Panel>
      </section>

      {message ? <p className={styles.message}>{message}</p> : null}

      <Panel title="Categories" subtitle={isArchivedView ? 'Archived category allocations.' : 'Create, rename, delete, and allocate budget by category.'}>
        <div className={styles.categoryList}>
          {budgetState.categories.map((category) => {
            const total = overview.categoryTotals.find((item) => item.id === category.id);
            const Icon = getCategoryIcon(category.icon);
            return (
              <article key={category.id} className={styles.categoryRow}>
                <div>
                  <span style={{ backgroundColor: category.color }} />
                  <Icon size={17} />
                  <strong>{category.name}</strong>
                </div>
                <p>{formatCurrency(total?.spent || 0)} spent</p>
                <p>{formatCurrency(category.budget)} budget</p>
                <p>{formatCurrency(category.budget - (total?.spent || 0))} remaining</p>
                {!isArchivedView ? (
                  <div className={styles.rowActions}>
                    <Button variant="secondary" icon={Edit3} onClick={() => openEditCategory(category)}>
                      Edit
                    </Button>
                    <Button variant="secondary" icon={Trash2} onClick={() => handleDeleteCategory(category.id)}>
                      Delete
                    </Button>
                  </div>
                ) : null}
              </article>
            );
          })}
        </div>
      </Panel>

      <Modal title={editingCategory ? 'Edit category' : 'Add category'} isOpen={isModalOpen} onClose={() => setIsModalOpen(false)}>
        <form className={styles.modalForm} onSubmit={handleAddCategory}>
          <Input label="Category Name" id="category-name" value={categoryName} onChange={(event) => setCategoryName(event.target.value)} placeholder="Subscriptions" />
          <Input label="Budget Amount" id="category-budget" type="number" min="1" value={categoryBudget} onChange={(event) => setCategoryBudget(event.target.value)} placeholder="180" />
          <label className={styles.selectLabel} htmlFor="category-icon">
            <span>Icon</span>
            <select id="category-icon" value={categoryIcon} onChange={(event) => setCategoryIcon(event.target.value)}>
              {categoryIconOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
          {message ? <p className={styles.message}>{message}</p> : null}
          <Button type="submit" icon={Plus}>{editingCategory ? 'Save Category' : 'Add Category'}</Button>
        </form>
      </Modal>
    </div>
  );
}

export default MonthlySetup;
