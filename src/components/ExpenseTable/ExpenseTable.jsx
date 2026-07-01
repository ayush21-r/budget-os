import { Edit3, Trash2 } from 'lucide-react';
import { formatDisplayDate } from '../../utils/dateUtils.js';
import { formatCurrencyPrecise } from '../../utils/formatters.js';
import Button from '../ui/Button/Button.jsx';
import styles from './ExpenseTable.module.css';

function ExpenseTable({ expenses, categories, onDeleteExpense, onEditExpense, readOnly = false }) {
  const categoryMap = new Map(categories.map((category) => [category.id, category]));

  return (
    <div className={styles.tableWrap}>
      <table className={styles.table}>
        <thead>
          <tr>
            <th>Expense</th>
            <th>Category</th>
            <th>Date</th>
            <th>Amount</th>
            {!readOnly ? <th>Actions</th> : null}
          </tr>
        </thead>
        <tbody>
          {expenses.map((expense) => {
            const category = categoryMap.get(expense.categoryId);
            return (
              <tr key={expense.id}>
                <td>{expense.title}</td>
                <td>
                  <span className={styles.category}>
                    <span style={{ backgroundColor: category?.color }} />
                    {category?.name || 'Other'}
                  </span>
                </td>
                <td>{formatDisplayDate(expense.date)}</td>
                <td>{formatCurrencyPrecise(expense.amount)}</td>
                {!readOnly ? (
                  <td>
                    <div className={styles.actions}>
                      <Button variant="secondary" icon={Edit3} onClick={() => onEditExpense(expense)}>
                        Edit
                      </Button>
                      <Button variant="secondary" icon={Trash2} onClick={() => onDeleteExpense(expense.id)}>
                        Delete
                      </Button>
                    </div>
                  </td>
                ) : null}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

export default ExpenseTable;
