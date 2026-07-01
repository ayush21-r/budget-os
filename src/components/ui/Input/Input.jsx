import styles from './Input.module.css';

function Input({ label, id, ...props }) {
  return (
    <label className={styles.field} htmlFor={id}>
      <span>{label}</span>
      <input id={id} className={styles.input} {...props} />
    </label>
  );
}

export default Input;
