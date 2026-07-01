import styles from './Button.module.css';

function Button({ children, variant = 'primary', icon: Icon, className = '', ...props }) {
  return (
    <button className={`${styles.button} ${styles[variant]} ${className}`} type="button" {...props}>
      {Icon ? <Icon size={17} /> : null}
      <span>{children}</span>
    </button>
  );
}

export default Button;
