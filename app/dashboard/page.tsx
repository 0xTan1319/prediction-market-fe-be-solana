import { UserDashboard } from "@/components/user-dashboard"

export default function DashboardPage() {
  return (
    <div className="container-mobile py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2 text-white">Trading Dashboard</h1>
        <p className="text-meteora-gray">Track your trades, positions, and performance</p>
      </div>

      <UserDashboard />
    </div>
  )
}
