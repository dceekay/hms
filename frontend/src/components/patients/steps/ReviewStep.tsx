interface Props {
  patient: any;
}

export default function ReviewStep({ patient }: Props) {
  return (
    <>
      <h2>Review Patient Information</h2>

      <div className="review-grid">

        {Object.entries(patient).map(([key, value]) => (
          <div className="review-item" key={key}>
            <span>{key}</span>
            <strong>{String(value || "-")}</strong>
          </div>
        ))}

      </div>
    </>
  );
}