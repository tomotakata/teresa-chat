import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'

export async function POST(req: NextRequest) {
  const { name, slug, adminEmail, adminPass } = await req.json()

  if (!name || !slug || !adminEmail || !adminPass) {
    return NextResponse.json({ error: 'Missing fields' }, { status: 400 })
  }

  const supabase = createServiceClient()

  const { data: tenant, error: tenantError } = await supabase
    .from('tenants')
    .insert({ name, slug })
    .select('id')
    .single()

  if (tenantError || !tenant) {
    return NextResponse.json({ error: tenantError?.message ?? 'Failed to create tenant' }, { status: 500 })
  }

  const { data: authUser, error: authError } = await supabase.auth.admin.createUser({
    email: adminEmail,
    password: adminPass,
    email_confirm: true,
    user_metadata: { tenant_id: tenant.id, user_role: 'admin' },
    app_metadata: { tenant_id: tenant.id, user_role: 'admin' },
  })

  if (authError || !authUser.user) {
    await supabase.from('tenants').delete().eq('id', tenant.id)
    return NextResponse.json({ error: authError?.message ?? 'Failed to create user' }, { status: 500 })
  }

  await supabase.from('users').insert({
    id: authUser.user.id,
    tenant_id: tenant.id,
    email: adminEmail,
    role: 'admin',
  })

  await supabase.from('ai_settings').insert({ tenant_id: tenant.id })

  return NextResponse.json({ ok: true, tenantId: tenant.id })
}
