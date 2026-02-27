import { createClient } from '@/lib/supabase/server'
import TenantsClient from './TenantsClient'

export default async function TenantsPage() {
  const supabase = await createClient()

  const { data: tenants } = await supabase
    .from('tenants')
    .select('id, name, slug, plan, created_at')
    .order('created_at', { ascending: false })

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-8">テナント管理</h1>
      <TenantsClient tenants={tenants ?? []} />
    </div>
  )
}
