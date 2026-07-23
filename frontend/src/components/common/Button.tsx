import { ButtonHTMLAttributes } from "react";

interface Props extends ButtonHTMLAttributes<HTMLButtonElement> {
  loading?: boolean;
}

export default function Button({
  loading,
  children,
  ...props
}: Props) {
  return (
    <button
      className="primary-btn"
      disabled={loading}
      {...props}
    >
      {loading ? "Loading..." : children}
    </button>
  );
}