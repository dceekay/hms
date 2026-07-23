const schedule = [
  {
    time: "09:00",
    patient: "John Doe",
    doctor: "Dr. Adams",
  },
  {
    time: "10:30",
    patient: "Mary Smith",
    doctor: "Dr. Bello",
  },
  {
    time: "12:00",
    patient: "James Wilson",
    doctor: "Dr. Musa",
  },
];

export default function ScheduleWidget() {
  return (
    <div className="schedule-widget">
      {schedule.map((item, index) => (
        <div
          key={index}
          className="schedule-item"
        >
          <strong>{item.time}</strong>

          <div>
            <p>{item.patient}</p>

            <small>{item.doctor}</small>
          </div>
        </div>
      ))}
    </div>
  );
}