interface Props {
  current: number;
  total: number;

  previous(): void;

  next(): void;

  finish(): void;
}

export default function WizardNavigation({
  current,
  total,
  previous,
  next,
  finish
}: Props) {
  return (
    <div className="wizard-nav">

      <button
        disabled={current === 0}
        onClick={previous}
      >
        Previous
      </button>

      {current === total - 1 ? (
        <button
          className="primary-btn"
          onClick={finish}
        >
          Register Patient
        </button>
      ) : (
        <button
          className="primary-btn"
          onClick={next}
        >
          Next
        </button>
      )}

    </div>
  );
}