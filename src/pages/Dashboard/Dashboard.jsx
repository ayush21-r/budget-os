import { PiggyBank, ReceiptText, Target, Wallet } from 'lucide-react';
import { useState } from 'react';
import BudgetPieChart from '../../charts/BudgetPieChart/BudgetPieChart.jsx';
import ExpenseForm from '../../components/ExpenseForm/ExpenseForm.jsx';
import ExpenseTable from '../../components/ExpenseTable/ExpenseTable.jsx';
import PageHeader from '../../components/PageHeader/PageHeader.jsx';
import Panel from '../../components/Panel/Panel.jsx';
import ProgressCard from '../../components/ProgressCard/ProgressCard.jsx';
import SummaryCard from '../../components/SummaryCard/SummaryCard.jsx';
import Button from '../../components/ui/Button/Button.jsx';
import Dropdown from '../../components/ui/Dropdown/Dropdown.jsx';
import Input from '../../components/ui/Input/Input.jsx';
import Modal from '../../components/ui/Modal/Modal.jsx';
import { usePageTitle } from '../../hooks/usePageTitle.js';
import { formatCurrency } from '../../utils/formatters.js';
import styles from './Dashboard.module.css';

function Dashboard({ budgetState, actions, overview, isArchivedView, activeMonthId, setActiveMonthId, monthOptions }) {
  usePageTitle('Dashboard');
  const [editingExpense, setEditingExpense] = useState(null);
  const [editAmount, setEditAmount] = useState('');
  const [editCategoryId, setEditCategoryId] = useState('');
  const [error, setError] = useState('');

  async function handleAddExpense(expense) {
    const category = budgetState.categories.find((item) => item.id === expense.category_id);
    try {
      await actions.createExpense({
        monthId: budgetState.profile.id,
        category_id: expense.category_id,
        amount: expense.amount,
        description: category ? `${category.name} Expense` : 'Expense',
        expense_date: new Date().toISOString().slice(0, 10),
      });
      setError('');
    } catch (expenseError) {
      setError(expenseError.message || 'Unable to add expense.');
    }
  }

  async function handleDeleteExpense(expenseId) {
    try {
      await actions.deleteExpense(expenseId);
      setError('');
    } catch (expenseError) {
      setError(expenseError.message || 'Unable to delete expense.');
    }
  }

  function openEditExpense(expense) {
    setEditingExpense(expense);
    setEditAmount(String(expense.amount));
    setEditCategoryId(expense.category_id);
    setError('');
  }

  async function handleEditExpense(event) {
    event.preventDefault();
    if (!editAmount || Number(editAmount) <= 0) {
      setError('Enter a valid expense amount.');
      return;
    }
    if (!budgetState.categories.some((category) => category.id === editCategoryId)) {
      setError('Choose a valid category.');
      return;
    }

    try {
      await actions.updateExpense(editingExpense.id, {
        amount: Number(editAmount),
        category_id: editCategoryId,
        description: editingExpense.description,
        expense_date: editingExpense.expense_date,
      });
      setEditingExpense(null);
      setError('');
    } catch (expenseError) {
      setError(expenseError.message || 'Unable to save expense.');
    }
  }

  const orderedExpenses = [...budgetState.expenses].sort(
    (first, second) => new Date(second.created_at || 0) - new Date(first.created_at || 0)
  );

  return (
    <div className="pageFade">
      <PageHeader
        eyebrow={budgetState.profile.month}
        title={isArchivedView ? 'Archived month snapshot.' : 'Your month at a glance.'}
        description={isArchivedView ? 'Previous months remain viewable and locked from editing.' : 'Plan allowance, log spending quickly, and keep category drift visible before it becomes a problem.'}
        actions={
          <Dropdown label="Month" id="dashboard-month" value={activeMonthId} onChange={(event) => setActiveMonthId(event.target.value)}>
            {monthOptions.map((month) => (
              <option key={month.id} value={month.id}>
                {month.label}
              </option>
            ))}
          </Dropdown>
        }
      />

      <section className={styles.summaryGrid}>
        <SummaryCard label="Monthly Allowance" value={formatCurrency(budgetState.profile.allowance)} note="Available for this cycle" tone="neutral" icon={Wallet} />
        <SummaryCard label="Current Balance" value={formatCurrency(overview.current_balance)} note="After recorded expenses" tone="good" icon={PiggyBank} />
        <SummaryCard label="Savings Goal" value={formatCurrency(budgetState.profile.savings_goal)} note="Planned monthly reserve" tone="good" icon={Target} />
        <SummaryCard label="Money Spent" value={formatCurrency(overview.spent)} note={`${overview.categoryTotals.length} active categories`} tone="warning" icon={ReceiptText} />
        <SummaryCard label="Remaining Budget" value={formatCurrency(overview.remaining_budget)} note="Available spending left" tone={overview.remaining_budget >= 0 ? 'good' : 'warning'} icon={Wallet} />
      </section>

      {!isArchivedView ? (
        <section className={styles.mainGrid}>
          <Panel title="Quick Expense Entry" subtitle="Add a transaction to see dashboard totals update instantly.">
            <ExpenseForm categories={budgetState.categories} onAddExpense={handleAddExpense} />
          </Panel>

          <Panel title="Spending Mix" subtitle="Current spending by category.">
            <BudgetPieChart data={overview.categoryTotals.filter((category) => category.spent > 0)} />
          </Panel>
        </section>
      ) : (
        <section className={styles.mainGrid}>
          <Panel title="Spending Mix" subtitle="Archived spending by category.">
            <BudgetPieChart data={overview.categoryTotals.filter((category) => category.spent > 0)} />
          </Panel>
          <Panel title="Archive Status" subtitle="This month is locked. Start a reset from Settings to create new archives.">
            <div className={styles.archiveNote}>{formatCurrency(overview.spent)} total expenses recorded.</div>
          </Panel>
        </section>
      )}

      <section className={styles.contentGrid}>
        <Panel title="Category Progress" subtitle="Budget health across every allocation." className={styles.progressPanel}>
          <div className={styles.progressGrid}>
            {overview.categoryTotals.map((category) => (
              <ProgressCard key={category.id} category={category} />
            ))}
          </div>
        </Panel>

        <Panel title="Recent Expenses" subtitle="Latest transactions.">
          <ExpenseTable
            expenses={orderedExpenses.slice(0, 7)}
            categories={budgetState.categories}
            onDeleteExpense={handleDeleteExpense}
            onEditExpense={openEditExpense}
            readOnly={isArchivedView}
          />
        </Panel>
      </section>

      <Modal title="Edit expense" isOpen={Boolean(editingExpense)} onClose={() => setEditingExpense(null)}>
        <form className={styles.modalForm} onSubmit={handleEditExpense}>
          <Input label="Amount" id="edit-expense-amount" type="number" min="1" step="0.01" value={editAmount} onChange={(event) => setEditAmount(event.target.value)} />
          <Dropdown label="Category" id="edit-expense-category" value={editCategoryId} onChange={(event) => setEditCategoryId(event.target.value)}>
            {budgetState.categories.map((category) => (
              <option key={category.id} value={category.id}>
                {category.name}
              </option>
            ))}
          </Dropdown>
          {error ? <p className={styles.error}>{error}</p> : null}
          <Button type="submit">Save Expense</Button>
        </form>
      </Modal>
    </div>
  );
}

export default Dashboard;
