import './Button.css';

export default function Button({ variant = 'primary', size = 'md', loading, children, ...props }) {
  return (
    <button className={`btn btn-${variant} btn-${size}`} disabled={loading || props.disabled} {...props}>
      {loading ? <span className="btn-spinner" /> : children}
    </button>
  );
}
