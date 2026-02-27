-- ============================================================
-- FonDesk AI - Supabase セットアップSQL (全部まとめて実行)
-- Supabase Dashboard > SQL Editor > New Query で貼り付けて実行
-- ============================================================

-- ① pgvector 拡張を有効化
create extension if not exists vector;

-- ② テーブル作成 -----------------------------------------------

create table if not exists tenants (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  plan text not null default 'free',
  created_at timestamptz not null default now()
);

create table if not exists users (
  id uuid primary key references auth.users(id) on delete cascade,
  tenant_id uuid not null references tenants(id) on delete cascade,
  email text not null,
  role text not null default 'member',
  created_at timestamptz not null default now()
);

create table if not exists knowledge_docs (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references tenants(id) on delete cascade,
  title text not null,
  type text not null default 'text',
  storage_path text,
  status text not null default 'processing',
  chunk_count int not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists knowledge_chunks (
  id uuid primary key default gen_random_uuid(),
  doc_id uuid not null references knowledge_docs(id) on delete cascade,
  tenant_id uuid not null references tenants(id) on delete cascade,
  content text not null,
  embedding vector(1536),
  metadata jsonb not null default '{}',
  created_at timestamptz not null default now()
);

create table if not exists channels (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references tenants(id) on delete cascade,
  type text not null,
  name text not null default '',
  config jsonb not null default '{}',
  enabled boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists conversations (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references tenants(id) on delete cascade,
  channel_id uuid references channels(id) on delete set null,
  channel text not null,
  channel_user_id text not null,
  channel_user_name text,
  status text not null default 'open',
  escalated_to text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references conversations(id) on delete cascade,
  role text not null,
  content text not null,
  metadata jsonb not null default '{}',
  created_at timestamptz not null default now()
);

create table if not exists ai_settings (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null unique references tenants(id) on delete cascade,
  system_prompt text not null default 'あなたは親切なカスタマーサポートアシスタントです。提供された情報を基に、お客様の質問に丁寧かつ正確に回答してください。',
  model text not null default 'gpt-4o',
  temperature float not null default 0.3,
  max_tokens int not null default 1000,
  similarity_threshold float not null default 0.7,
  top_k int not null default 5,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ③ インデックス -----------------------------------------------

create index if not exists idx_knowledge_chunks_embedding
  on knowledge_chunks using ivfflat (embedding vector_cosine_ops) with (lists = 100);
create index if not exists idx_knowledge_chunks_tenant on knowledge_chunks (tenant_id);
create index if not exists idx_knowledge_docs_tenant on knowledge_docs (tenant_id);
create index if not exists idx_conversations_tenant on conversations (tenant_id, status, updated_at desc);
create index if not exists idx_messages_conversation on messages (conversation_id, created_at asc);
create index if not exists idx_channels_tenant on channels (tenant_id, type);

-- ④ ヘルパー関数 -----------------------------------------------

create or replace function match_chunks(
  query_embedding vector(1536),
  match_tenant_id uuid,
  match_count int default 5,
  match_threshold float default 0.7
)
returns table (
  id uuid,
  doc_id uuid,
  content text,
  metadata jsonb,
  similarity float
)
language plpgsql
as $$
begin
  return query
  select
    kc.id,
    kc.doc_id,
    kc.content,
    kc.metadata,
    1 - (kc.embedding <=> query_embedding) as similarity
  from knowledge_chunks kc
  where kc.tenant_id = match_tenant_id
    and 1 - (kc.embedding <=> query_embedding) > match_threshold
  order by kc.embedding <=> query_embedding
  limit match_count;
end;
$$;

create or replace function update_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists conversations_updated_at on conversations;
create trigger conversations_updated_at
  before update on conversations
  for each row execute function update_updated_at();

drop trigger if exists ai_settings_updated_at on ai_settings;
create trigger ai_settings_updated_at
  before update on ai_settings
  for each row execute function update_updated_at();

-- ⑤ JWTカスタムクレーム (tenant_id / user_role をJWTに埋め込む) ---

create or replace function custom_access_token_hook(event jsonb)
returns jsonb
language plpgsql
stable
as $$
declare
  claims jsonb;
  user_tenant_id text;
  user_role_val text;
begin
  select u.tenant_id::text, u.role
    into user_tenant_id, user_role_val
    from users u
   where u.id = (event->>'user_id')::uuid;

  claims := event->'claims';

  if user_tenant_id is not null then
    claims := jsonb_set(claims, '{tenant_id}', to_jsonb(user_tenant_id));
    claims := jsonb_set(claims, '{user_role}', to_jsonb(user_role_val));
  end if;

  return jsonb_set(event, '{claims}', claims);
end;
$$;

grant execute on function custom_access_token_hook to supabase_auth_admin;

-- ⑥ Row Level Security -----------------------------------------------

alter table tenants enable row level security;
alter table users enable row level security;
alter table knowledge_docs enable row level security;
alter table knowledge_chunks enable row level security;
alter table channels enable row level security;
alter table conversations enable row level security;
alter table messages enable row level security;
alter table ai_settings enable row level security;

create or replace function auth_tenant_id()
returns uuid language sql stable as $$
  select (auth.jwt() ->> 'tenant_id')::uuid;
$$;

create or replace function auth_role()
returns text language sql stable as $$
  select auth.jwt() ->> 'user_role';
$$;

-- tenants
drop policy if exists "tenants_select" on tenants;
create policy "tenants_select" on tenants for select
  using (id = auth_tenant_id() or auth_role() = 'super_admin');

drop policy if exists "tenants_insert" on tenants;
create policy "tenants_insert" on tenants for insert
  with check (auth_role() = 'super_admin');

drop policy if exists "tenants_update" on tenants;
create policy "tenants_update" on tenants for update
  using (id = auth_tenant_id() and auth_role() in ('admin', 'super_admin'));

-- users
drop policy if exists "users_select" on users;
create policy "users_select" on users for select
  using (tenant_id = auth_tenant_id() or auth_role() = 'super_admin');

drop policy if exists "users_insert" on users;
create policy "users_insert" on users for insert
  with check (tenant_id = auth_tenant_id() or auth_role() = 'super_admin');

-- knowledge_docs
drop policy if exists "knowledge_docs_all" on knowledge_docs;
create policy "knowledge_docs_all" on knowledge_docs for all
  using (tenant_id = auth_tenant_id());

-- knowledge_chunks
drop policy if exists "knowledge_chunks_select" on knowledge_chunks;
create policy "knowledge_chunks_select" on knowledge_chunks for select
  using (tenant_id = auth_tenant_id());

-- channels
drop policy if exists "channels_all" on channels;
create policy "channels_all" on channels for all
  using (tenant_id = auth_tenant_id());

-- conversations
drop policy if exists "conversations_all" on conversations;
create policy "conversations_all" on conversations for all
  using (tenant_id = auth_tenant_id());

-- messages
drop policy if exists "messages_select" on messages;
create policy "messages_select" on messages for select
  using (
    conversation_id in (
      select id from conversations where tenant_id = auth_tenant_id()
    )
  );

-- ai_settings
drop policy if exists "ai_settings_all" on ai_settings;
create policy "ai_settings_all" on ai_settings for all
  using (tenant_id = auth_tenant_id());
