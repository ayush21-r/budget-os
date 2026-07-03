import { Plus } from 'lucide-react';
import { useEffect, useState } from 'react';
import Button from '../ui/Button/Button.jsx';
import Dropdown from '../ui/Dropdown/Dropdown.jsx';
import Input from '../ui/Input/Input.jsx';
import styles from './ExpenseForm.module.css';

function ExpenseForm({ categories, onAddExpense }) {
  const [amount, setAmount] = useState('');
  const [category_id, setCategoryId] = useState(categories[0]?.id || '');
  const [error, setError] = useState('');

  useEffect(() => {
    if (!categories.some((category) => category.id === category_id)) {
      setCategoryId(categories[0]?.id || '');
    }
  }, [categories, category_id]);

  function handleSubmit(event) {
    event.preventDefault();
    if (!amount) {
      setError('Enter an amount.');
      return;
    }
    if (Number(amount) <= 0) {
      setError('Amount must be greater than zero.');
      return;
    }
    if (!categories.some((category) => category.id === category_id)) {
      setError('Choose a valid category.');
      return;
    }

    onAddExpense({ amount: Number(amount), category_id });
    setAmount('');
    setError('');
  }

  return (
    <div>
      <form className={styles.form} onSubmit={handleSubmit}>
        <Input label="Amount" id="expense-amount" type="number" min="1" step="0.01" placeholder="0.00" value={amount} onChange={(event) => setAmount(event.target.value)} />
        <Dropdown label="Category" id="expense-category" value={category_id} onChange={(event) => setCategoryId(event.target.value)}>
          {categories.map((category) => (
            <option key={category.id} value={category.id}>
              {category.name}
            </option>
          ))}
        </Dropdown>
        <Button type="submit" icon={Plus} className={styles.submit}>
          Add Expense
        </Button>
      </form>
      {error ? <p className={styles.error}>{error}</p> : null}
    </div>
  );
}

export default ExpenseForm;
