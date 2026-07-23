import AdminLayout from "../layouts/AdminLayout";

import DashboardHeader from "../components/dashboard/DashboardHeader";
import StatCard from "../components/dashboard/StatCard";

import {
    FiUsers,
    FiCalendar,
    FiDollarSign,
    FiActivity
} from "react-icons/fi";

export default function DashboardPage() {
    return (
        <AdminLayout>

            <DashboardHeader />

            <div className="stats-grid">

                <StatCard
                    title="Patients"
                    value="3,428"
                    icon={<FiUsers />}
                    color="#2563eb"
                />

                <StatCard
                    title="Appointments"
                    value="248"
                    icon={<FiCalendar />}
                    color="#8b5cf6"
                />

                <StatCard
                    title="Revenue"
                    value="$18,940"
                    icon={<FiDollarSign />}
                    color="#10b981"
                />

                <StatCard
                    title="Admissions"
                    value="42"
                    icon={<FiActivity />}
                    color="#f97316"
                />

            </div>

        </AdminLayout>
    );
}