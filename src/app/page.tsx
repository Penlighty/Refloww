import StatsGrid from "@/components/StatsGrid";
import QuickActions from "@/components/QuickActions";
import RecentTransactions from "@/components/RecentTransactions";
import DashboardActionBanner from "@/components/DashboardActionBanner";

export default function Home() {
  return (
    <div className="w-full flex flex-col gap-6">
      {/* Decision-First Action Banner (Collapsible) */}
      <DashboardActionBanner />

      {/* Stats Section */}
      <StatsGrid />

      {/* Quick Actions Grid */}
      <QuickActions />

      {/* Recent Transactions - Full Width */}
      <RecentTransactions />
    </div>
  );
}
