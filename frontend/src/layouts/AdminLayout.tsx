import { ReactNode, useState } from "react";

import { Sidebar } from "../components/layout/Sidebar";
import Topbar from "../components/layout/Topbar";
import MobileBottomNav from "../components/layout/MobileBottomNav";
import RoleTour from "../components/tour/RoleTour";
import GlobalLabOrderRinger from "../components/laboratory/GlobalLabOrderRinger";

import "../styles/sidebar.css";
import "../styles/topbar.css";
import "../styles/dashboard.css";
import "../styles/cards.css";
import "../styles/tour.css";
import "../styles/theme-visibility.css";

interface AdminLayoutProps {
  children: ReactNode;
}

export default function AdminLayout({
  children,
}: AdminLayoutProps) {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <div className="admin-layout">
      <Sidebar
        collapsed={collapsed}
        toggle={() => setCollapsed((prev) => !prev)}
        mobileOpen={mobileOpen}
        onCloseMobile={() => setMobileOpen(false)}
      />

      <main
        className={`main-content ${
          collapsed ? "collapsed" : ""
        }`}
      >
        <Topbar onToggleMobileNav={() => setMobileOpen((prev) => !prev)} />

        <section className="page-content">
          {children}
        </section>
      </main>

      <MobileBottomNav onOpenMenu={() => setMobileOpen(true)} />
      <GlobalLabOrderRinger />
      <RoleTour />
    </div>
  );
}
