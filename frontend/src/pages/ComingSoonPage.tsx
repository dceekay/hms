import { ReactNode } from "react";
import AdminLayout from "../layouts/AdminLayout";

interface ComingSoonPageProps {
  title: string;
  description: string;
  icon?: ReactNode;
}

export default function ComingSoonPage({ title, description, icon }: ComingSoonPageProps) {
  return (
    <AdminLayout>
      <section className="coming-soon">
        <div className="coming-icon">{icon}</div>
        <p className="eyebrow">Module checkpoint</p>
        <h1>{title}</h1>
        <p>{description}</p>
      </section>
    </AdminLayout>
  );
}
