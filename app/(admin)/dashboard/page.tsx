import { Button } from '@/components/ui/button'
import { UserGreeting } from '@/components/auth/UserGreeting'

export default async function DashboardPage() {
  return (
    <div>
      <h1 className="mb-2 text-2xl font-semibold">ダッシュボード</h1>
      <UserGreeting />
      <div className="mt-4 flex gap-3">
        <Button>プライマリ</Button>
        <Button variant="secondary">セカンダリ</Button>
        <Button variant="outline">アウトライン</Button>
      </div>
    </div>
  )
}
