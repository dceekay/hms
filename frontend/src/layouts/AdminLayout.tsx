import { ReactNode, useState } from "react";

import { Sidebar } from "../components/layout/Sidebar";
import Topbar from "../components/layout/Topbar";
import MobileBottomNav from "../components/layout/MobileBottomNav";
import RoleTour from "../components/tour/RoleTour";
import PwaInstallBanner from "../components/pwa/PwaInstallBanner";
import PushAlertPrompt from "../components/pwa/PushAlertPrompt";

import "../styles/sidebar.css";
import "../styles/topbar.css";
import "../styles/dashboard.css";
import "../styles/cards.css";
import "../styles/tour.css";
import "../styles/pwa.css";

interface AdminLayoutProps {
  children: ReactNode;
}

export default function AdminLayout({
  children,
}: AdminLayoutProps) {
  const [collapsed, setCollapsed] = useState(false);

  return (
    <div className="admin-layout">
      <Sidebar
        collapsed={collapsed}
        toggle={() => setCollapsed((prev) => !prev)}
      />

      <main
        className={`main-content ${
          collapsed ? "collapsed" : ""
        }`}
      >
        <Topbar />

        <section className="page-content">
          <PushAlertPrompt />
          {children}
        </section>
      </main>

      <MobileBottomNav />
      <RoleTour />
      <PwaInstallBanner />
    </div>
  );
}
