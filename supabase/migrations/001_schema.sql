-- Enable pgvector extension
create extension if not exists vector;

-- Tenants
create table tenants (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  plan text not null default 'free',
  created_at timestamptz not null default now()
);

-- Users (linked to Supabase Auth)
create table users (
  id uuid primary key references auth.users(id) on delete cascade,
  tenant_id uuid not null references tenants(id) on delete cascade,
  email text not null,
  role text not null default 'member', -- 'super_admin' | 'admin' | 'member'
  created_at timestamptz not null default now()
);

-- Knowledge documents
create table knowledge_docs (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references tenants(id) on delete cascade,
  title text not null,
  type text not null default 'text', -- 'pdf' | 'text'
  storage_path text,
  status text not null default 'processing', -- 'processing' | 'ready' | 'error'
  chunk_count int not null default 0,
  created_at timestamptz not null default now()
);

-- Knowledge chunks with vector embeddings
create table knowledge_chunks (
  id uuid primary key default gen_random_uuid(),
  doc_id uuid not null references knowledge_docs(id) on delete cascade,
  tenant_id uuid not null references tenants(id) on delete cascade,
  content text not null,
  embedding vector(1536),
  metadata jsonb not null default '{}',
  created_at timestamptz not null default now()
);

-- Channels (LINE / email / widget)
create table channels (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references tenants(id) on delete cascade,
  type text not null, -- 'line' | 'email' | 'widget'
  name text not null default '',
  config jsonb not null default '{}',
  enabled boolean not null default true,
  created_at timestamptz not null default now()
);

-- Conversations
create table conversations (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references tenants(id) on delete cascade,
  channel_id uuid references channels(id) on delete set null,
  channel text not null, -- 'line' | 'email' | 'widget'
  channel_user_id text not null,
  channel_user_name text,
  status text not null default 'open', -- 'open' | 'resolved' | 'escalated'
  escalated_to text, -- email address for escalation
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Messages
create table messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references conversations(id) on delete cascade,
  role text not null, -- 'user' | 'assistant'
  content text not null,
  metadata jsonb not null default '{}',
  created_at timestamptz not null default now()
);

-- AI settings per tenant
create table ai_settings (
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

-- Indexes
create index on knowledge_chunks using ivfflat (embedding vector_cosine_ops) with (lists = 100);
create index on knowledge_chunks (tenant_id);
create index on knowledge_docs (tenant_id);
create index on conversations (tenant_id, status, updated_at desc);
create index on messages (conversation_id, created_at asc);
create index on channels (tenant_id, type);

-- Function: similarity search
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

-- Function: update updated_at
create or replace function update_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger conversations_updated_at
  before update on conversations
  for each row execute function update_updated_at();

create trigger ai_settings_updated_at
  before update on ai_settings
  for each row execute function update_updated_at();
