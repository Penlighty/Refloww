import StatsGrid from "@/components/StatsGrid";
import QuickActions from "@/components/QuickActions";
import RecentTransactions from "@/components/RecentTransactions";

export default function Home() {
  return (
    <div className="w-full flex flex-col gap-8">
      {/* Stats Section */}
      <StatsGrid />

      {/* Quick Actions Grid */}
      <QuickActions />

      {/* Recent Transactions - Full Width */}
      <RecentTransactions />
    </div>
  );
}
