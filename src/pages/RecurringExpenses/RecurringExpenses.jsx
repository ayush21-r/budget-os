import { Edit3, Plus, Trash2, CalendarDays } from 'lucide-react';
import { useState } from 'react';
import PageHeader from '../../components/PageHeader/PageHeader.jsx';
import Panel from '../../components/Panel/Panel.jsx';
import Button from '../../components/ui/Button/Button.jsx';
import Input from '../../components/ui/Input/Input.jsx';
import Dropdown from '../../components/ui/Dropdown/Dropdown.jsx';
import Modal from '../../components/ui/Modal/Modal.jsx';
import { usePageTitle } from '../../hooks/usePageTitle.js';
import { formatCurrency } from '../../utils/formatters.js';
import { formatDisplayDate, getTodayInputValue } from '../../utils/dateUtils.js';
import styles from './RecurringExpenses.module.css';

const FREQUENCY_OPTIONS = [
  { value: 'daily', label: 'Daily' },
  { value: 'weekly', label: 'Weekly' },
  { value: 'biweekly', label: 'Bi-Weekly' },
  { value: 'monthly', label: 'Monthly' },
  { value: 'yearly', label: 'Yearly' },
];

const PAYMENT_METHODS = [
  { value: 'Card', label: 'Card' },
  { value: 'UPI', label: 'UPI' },
  { value: 'Cash', label: 'Cash' },
  { value: 'Bank Transfer', label: 'Bank Transfer' },
];

function RecurringExpenses({ budgetState, appState, actions }) {
  usePageTitle('Recurring Expenses');

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingRecur, setEditingRecur] = useState(null);
  const [description, setDescription] = useState('');
  const [categoryId, setCategoryId] = useState(budgetState.categories[0]?.id || '');
  const [amount, setAmount] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('Card');
  const [notes, setNotes] = useState('');
  const [frequency, setFrequency] = useState('monthly');
  const [startDate, setStartDate] = useState(getTodayInputValue());
  const [nextDueDate, setNextDueDate] = useState(getTodayInputValue());
  const [endDate, setEndDate] = useState('');
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  const recurringList = appState.recurringExpenses || [];
  const categoryMap = new Map(budgetState.categories.map((c) => [c.id, c]));

  function resetForm() {
    setDescription('');
    setCategoryId(budgetState.categories[0]?.id || '');
    setAmount('');
    setPaymentMethod('Card');
    setNotes('');
    setFrequency('monthly');
    setStartDate(getTodayInputValue());
    setNextDueDate(getTodayInputValue());
    setEndDate('');
    setEditingRecur(null);
    setError('');
  }

  function openAddModal() {
    resetForm();
    setIsModalOpen(true);
  }

  function openEditModal(recur) {
    setEditingRecur(recur);
    setDescription(recur.description || '');
    setCategoryId(recur.category_id || '');
    setAmount(String(recur.amount));
    setPaymentMethod(recur.payment_method || 'Card');
    setNotes(recur.notes || '');
    setFrequency(recur.frequency || 'monthly');
    setStartDate(recur.start_date || getTodayInputValue());
    setNextDueDate(recur.next_due_date || getTodayInputValue());
    setEndDate(recur.end_date || '');
    setError('');
    setIsModalOpen(true);
  }

  async function handleSubmit(event) {
    event.preventDefault();
    const trimmedDesc = description.trim();
    const parsedAmount = Number(amount);

    if (!trimmedDesc || isNaN(parsedAmount) || parsedAmount <= 0) {
      setError('Please provide a valid description and amount.');
      return;
    }

    if (!categoryId) {
      setError('Please choose a valid category.');
      return;
    }

    const payload = {
      description: trimmedDesc,
      category_id: categoryId,
      amount: parsedAmount,
      payment_method: paymentMethod,
      notes: notes.trim(),
      frequency,
      start_date: startDate,
      next_due_date: nextDueDate,
      end_date: endDate || null,
    };

    try {
      if (editingRecur) {
        await actions.updateRecurringExpense(editingRecur.id, payload);
        setMessage('Recurring expense updated successfully.');
      } else {
        await actions.createRecurringExpense(payload);
        setMessage('Recurring expense template created.');
      }
      setIsModalOpen(false);
      resetForm();
    } catch (err) {
      setError(err.message || 'Unable to save template.');
    }
  }

  async function handleDelete(id) {
    if (!window.confirm('Delete this recurring expense template?')) return;
    try {
      await actions.deleteRecurringExpense(id);
      setMessage('Template deleted.');
    } catch (err) {
      setMessage(err.message || 'Unable to delete.');
    }
  }

  async function handleToggleActive(recur) {
    try {
      await actions.updateRecurringExpense(recur.id, { active: !recur.active });
      setMessage(`Template is now ${!recur.active ? 'active' : 'inactive'}.`);
    } catch (err) {
      setMessage(err.message || 'Unable to toggle status.');
    }
  }

  return (
    <div className="pageFade">
      <PageHeader
        eyebrow="Recurring"
        title="Automate standard commitments."
        description="Define template bills, subscriptions, and regular expenses that post automatically each period."
        actions={
          <Button icon={Plus} onClick={openAddModal}>
            Add Recurring
          </Button>
        }
      />

      {message ? <p className={styles.message}>{message}</p> : null}

      <div className={styles.grid}>
        <Panel title="Recurring Expenses List" subtitle="Active templates that automatically post expenses on their next due date.">
          <div className={styles.tableWrap}>
            {recurringList.length === 0 ? (
              <div className={styles.noData}>No recurring templates defined. Click Add Recurring to begin.</div>
            ) : (
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th>Description</th>
                    <th>Category</th>
                    <th>Frequency</th>
                    <th>Amount</th>
                    <th>Next Due</th>
                    <th>Status</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {recurringList.map((recur) => {
                    const category = categoryMap.get(recur.category_id);
                    return (
                      <tr key={recur.id}>
                        <td data-label="Description">
                          <strong>{recur.description}</strong>
                        </td>
                        <td data-label="Category">
                          <span className={styles.category}>
                            <span style={{ backgroundColor: category?.color }} />
                            {category?.name || 'Other'}
                          </span>
                        </td>
                        <td data-label="Frequency">
                          <span className={styles.frequencyBadge}>{recur.frequency}</span>
                        </td>
                        <td data-label="Amount">
                          <strong>{formatCurrency(recur.amount)}</strong>
                        </td>
                        <td data-label="Next Due">
                          <div className={styles.category}>
                            <CalendarDays size={14} className="text-muted" />
                            <span>{formatDisplayDate(recur.next_due_date)}</span>
                          </div>
                        </td>
                        <td data-label="Status">
                          <label className={styles.switch}>
                            <input
                              type="checkbox"
                              checked={recur.active}
                              onChange={() => handleToggleActive(recur)}
                            />
                            <span className={styles.slider} />
                          </label>
                        </td>
                        <td data-label="Actions">
                          <div className={styles.actions}>
                            <Button variant="secondary" icon={Edit3} onClick={() => openEditModal(recur)}>
                              Edit
                            </Button>
                            <Button variant="secondary" icon={Trash2} onClick={() => handleDelete(recur.id)}>
                              Delete
                            </Button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        </Panel>
      </div>

      <Modal title={editingRecur ? 'Edit Recurring' : 'Add Recurring'} isOpen={isModalOpen} onClose={() => setIsModalOpen(false)}>
        <form className={styles.modalForm} onSubmit={handleSubmit}>
          <Input label="Description" id="recur-desc" value={description} onChange={(event) => setDescription(event.target.value)} placeholder="Netflix Premium" />
          
          <div className={styles.rowInputs}>
            <Input label="Amount" id="recur-amount" type="number" min="0.01" step="0.01" value={amount} onChange={(event) => setAmount(event.target.value)} placeholder="649.00" />
            <Dropdown label="Category" id="recur-cat" value={categoryId} onChange={(event) => setCategoryId(event.target.value)}>
              {budgetState.categories.map((cat) => (
                <option key={cat.id} value={cat.id}>
                  {cat.name}
                </option>
              ))}
            </Dropdown>
          </div>

          <div className={styles.rowInputs}>
            <label className={styles.selectLabel} htmlFor="recur-freq">
              <span>Frequency</span>
              <select id="recur-freq" value={frequency} onChange={(event) => setFrequency(event.target.value)}>
                {FREQUENCY_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </label>
            <label className={styles.selectLabel} htmlFor="recur-pm">
              <span>Payment Method</span>
              <select id="recur-pm" value={paymentMethod} onChange={(event) => setPaymentMethod(event.target.value)}>
                {PAYMENT_METHODS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <div className={styles.rowInputs}>
            <Input label="Start Date" id="recur-start" type="date" value={startDate} onChange={(event) => setStartDate(event.target.value)} />
            <Input label="Next Due Date" id="recur-due" type="date" value={nextDueDate} onChange={(event) => setNextDueDate(event.target.value)} />
          </div>

          <div className={styles.rowInputs}>
            <Input label="End Date (Optional)" id="recur-end" type="date" value={endDate} onChange={(event) => setEndDate(event.target.value)} />
            <Input label="Notes" id="recur-notes" value={notes} onChange={(event) => setNotes(event.target.value)} placeholder="Auto-charged on credit card" />
          </div>

          {error ? <p className={styles.error}>{error}</p> : null}
          <Button type="submit" icon={Plus}>
            {editingRecur ? 'Save Changes' : 'Create Recurring'}
          </Button>
        </form>
      </Modal>
    </div>
  );
}

export default RecurringExpenses;
