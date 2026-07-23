import StatusBadge from "../common/StatusBadge";

const patients = [
  {
    id: 1,
    name: "John Doe",
    gender: "Male",
    status: "Admitted",
  },
  {
    id: 2,
    name: "Mary Smith",
    gender: "Female",
    status: "Waiting",
  },
  {
    id: 3,
    name: "James Wilson",
    gender: "Male",
    status: "Discharged",
  },
];

export default function RecentPatients() {
  return (
    <table className="dashboard-table">
      <thead>
        <tr>
          <th>Patient</th>
          <th>Gender</th>
          <th>Status</th>
        </tr>
      </thead>

      <tbody>
        {patients.map((patient) => (
          <tr key={patient.id}>
            <td>{patient.name}</td>
            <td>{patient.gender}</td>
            <td>
              <StatusBadge
                text={patient.status}
                color={
                  patient.status === "Admitted"
                    ? "success"
                    : patient.status === "Waiting"
                    ? "warning"
                    : "info"
                }
              />
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}