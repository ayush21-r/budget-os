import { TrendingDown, TrendingUp } from 'lucide-react';
import styles from './SummaryCard.module.css';

function SummaryCard({ label, value, note, tone = 'neutral', icon: Icon }) {
  const TrendIcon = tone === 'good' ? TrendingUp : TrendingDown;

  return (
    <article className={`${styles.card} ${styles[tone]}`}>
      <div className={styles.topline}>
        <span>{label}</span>
        {Icon ? <Icon size={20} /> : null}
      </div>
      <strong>{value}</strong>
      <div className={styles.note}>
        <TrendIcon size={15} />
        <span>{note}</span>
      </div>
    </article>
  );
}

export default SummaryCard;
