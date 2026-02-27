-- Row Level Security

alter table tenants enable row level security;
alter table users enable row level security;
alter table knowledge_docs enable row level security;
alter table knowledge_chunks enable row level security;
alter table channels enable row level security;
alter table conversations enable row level security;
alter table messages enable row level security;
alter table ai_settings enable row level security;

-- Helper: get caller's tenant_id from JWT
create or replace function auth_tenant_id()
returns uuid language sql stable as $$
  select (auth.jwt() ->> 'tenant_id')::uuid;
$$;

-- Helper: get caller's role
create or replace function auth_role()
returns text language sql stable as $$
  select auth.jwt() ->> 'user_role';
$$;

-- tenants: only members of that tenant can read; super_admin can read all
create policy "tenants_select" on tenants for select
  using (id = auth_tenant_id() or auth_role() = 'super_admin');

create policy "tenants_insert" on tenants for insert
  with check (auth_role() = 'super_admin');

create policy "tenants_update" on tenants for update
  using (id = auth_tenant_id() and auth_role() in ('admin', 'super_admin'));

-- users
create policy "users_select" on users for select
  using (tenant_id = auth_tenant_id() or auth_role() = 'super_admin');

create policy "users_insert" on users for insert
  with check (tenant_id = auth_tenant_id() or auth_role() = 'super_admin');

-- knowledge_docs
create policy "knowledge_docs_select" on knowledge_docs for select
  using (tenant_id = auth_tenant_id());

create policy "knowledge_docs_insert" on knowledge_docs for insert
  with check (tenant_id = auth_tenant_id());

create policy "knowledge_docs_update" on knowledge_docs for update
  using (tenant_id = auth_tenant_id());

create policy "knowledge_docs_delete" on knowledge_docs for delete
  using (tenant_id = auth_tenant_id());

-- knowledge_chunks (via service_role only for writes; select via tenant)
create policy "knowledge_chunks_select" on knowledge_chunks for select
  using (tenant_id = auth_tenant_id());

-- channels
create policy "channels_all" on channels for all
  using (tenant_id = auth_tenant_id());

-- conversations
create policy "conversations_all" on conversations for all
  using (tenant_id = auth_tenant_id());

-- messages
create policy "messages_select" on messages for select
  using (
    conversation_id in (
      select id from conversations where tenant_id = auth_tenant_id()
    )
  );

-- ai_settings
create policy "ai_settings_all" on ai_settings for all
  using (tenant_id = auth_tenant_id());

-- Service role bypass (for webhooks / server-side)
-- service_role key bypasses RLS automatically in Supabase
