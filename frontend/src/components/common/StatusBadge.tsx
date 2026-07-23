interface Props {
  color?: "success" | "warning" | "danger" | "info";
  text: string;
}

export default function StatusBadge({
  color = "info",
  text,
}: Props) {
  return (
    <span className={`badge ${color}`}>
      {text}
    </span>
  );
}