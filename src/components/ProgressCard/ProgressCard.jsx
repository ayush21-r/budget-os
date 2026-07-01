import { formatCurrency } from '../../utils/formatters.js';
import { getCategoryIcon } from '../../utils/categoryIcons.js';
import styles from './ProgressCard.module.css';

function ProgressCard({ category }) {
  const Icon = getCategoryIcon(category.icon);

  return (
    <article className={`${styles.card} ${category.isOverBudget ? styles.warning : ''}`}>
      <div className={styles.header}>
        <div>
          <span className={styles.dot} style={{ backgroundColor: category.color }} />
          <Icon size={17} />
          <strong>{category.name}</strong>
        </div>
        <span>{Math.round(category.percentage)}%</span>
      </div>
      <div className={styles.track}>
        <div className={styles.fill} style={{ width: `${category.percentage}%`, backgroundColor: category.isOverBudget ? '#9f2d1e' : category.color }} />
      </div>
      <div className={styles.meta}>
        <span>{formatCurrency(category.spent)} spent</span>
        <span>{category.remaining < 0 ? `${formatCurrency(Math.abs(category.remaining))} over` : `${formatCurrency(category.remaining)} left`}</span>
      </div>
    </article>
  );
}

export default ProgressCard;
