import styles from './Dropdown.module.css';

function Dropdown({ label, id, children, ...props }) {
  return (
    <label className={styles.field} htmlFor={id}>
      <span>{label}</span>
      <select id={id} className={styles.select} {...props}>
        {children}
      </select>
    </label>
  );
}

export default Dropdown;
