const activities = [
  "Patient John Doe registered",
  "Invoice #1024 paid",
  "Lab report completed",
  "Medicine dispensed",
  "Appointment scheduled",
];

export default function ActivityFeed() {
  return (
    <div className="activity-feed">
      {activities.map((activity, index) => (
        <div
          className="activity-item"
          key={index}
        >
          <div className="activity-dot"></div>

          <div>

            <p>{activity}</p>

            <small>Just now</small>

          </div>
        </div>
      ))}
    </div>
  );
}