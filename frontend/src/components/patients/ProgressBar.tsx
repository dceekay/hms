interface Props {
  current: number;
  steps: string[];
}

export default function ProgressBar({
  current,
  steps
}: Props) {
  return (
    <div className="progress-wrapper">

      {steps.map((step, index) => (

        <div
          key={step}
          className="progress-item"
        >

          <div
            className={
              index <= current
                ? "progress-circle active"
                : "progress-circle"
            }
          >
            {index + 1}
          </div>

          <span>{step}</span>

        </div>

      ))}

    </div>
  );
}