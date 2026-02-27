-- ============================================================
-- Teresa - プロジェクト・お客様マイページ 追加マイグレーション
-- Supabase Dashboard > SQL Editor > New Query で実行
-- ============================================================

-- 1. プロジェクトテーブル
CREATE TABLE IF NOT EXISTS projects (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  name text NOT NULL,
  slug text NOT NULL UNIQUE,
  description text,
  welcome_message text NOT NULL DEFAULT 'こんにちは！何かお手伝いできることはありますか？',
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- 2. お客様テーブル（Supabase Auth と連携）
CREATE TABLE IF NOT EXISTS customers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  auth_user_id uuid UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  email text NOT NULL UNIQUE,
  name text,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- 3. conversations に project_id / customer_id を追加
ALTER TABLE conversations ADD COLUMN IF NOT EXISTS project_id uuid REFERENCES projects(id) ON DELETE SET NULL;
ALTER TABLE conversations ADD COLUMN IF NOT EXISTS customer_id uuid REFERENCES customers(id) ON DELETE SET NULL;

-- 4. knowledge_docs / knowledge_chunks に project_id を追加（NULL許容・既存データ互換）
ALTER TABLE knowledge_docs ADD COLUMN IF NOT EXISTS project_id uuid REFERENCES projects(id) ON DELETE SET NULL;
ALTER TABLE knowledge_chunks ADD COLUMN IF NOT EXISTS project_id uuid REFERENCES projects(id) ON DELETE SET NULL;

-- 5. インデックス
CREATE INDEX IF NOT EXISTS idx_projects_tenant ON projects(tenant_id);
CREATE INDEX IF NOT EXISTS idx_conversations_project ON conversations(project_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_conversations_customer ON conversations(customer_id);
CREATE INDEX IF NOT EXISTS idx_customers_email ON customers(email);

-- 6. RLS
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "projects_all" ON projects;
CREATE POLICY "projects_all" ON projects FOR ALL
  USING (tenant_id = auth_tenant_id());

DROP POLICY IF EXISTS "customers_select_own" ON customers;
CREATE POLICY "customers_select_own" ON customers FOR SELECT
  USING (auth_user_id = auth.uid());

DROP POLICY IF EXISTS "customers_insert_own" ON customers FOR INSERT ON customers;
CREATE POLICY "customers_insert_own" ON customers FOR INSERT
  WITH CHECK (auth_user_id = auth.uid());

DROP POLICY IF EXISTS "customers_update_own" ON customers;
CREATE POLICY "customers_update_own" ON customers FOR UPDATE
  USING (auth_user_id = auth.uid());

-- conversations: お客様も自分の会話を読める
DROP POLICY IF EXISTS "conversations_customer_select" ON conversations;
CREATE POLICY "conversations_customer_select" ON conversations FOR SELECT
  USING (
    tenant_id = auth_tenant_id()
    OR customer_id IN (
      SELECT id FROM customers WHERE auth_user_id = auth.uid()
    )
  );

-- messages: お客様も自分の会話のメッセージを読める
DROP POLICY IF EXISTS "messages_customer_select" ON messages;
CREATE POLICY "messages_customer_select" ON messages FOR SELECT
  USING (
    conversation_id IN (
      SELECT id FROM conversations
      WHERE tenant_id = auth_tenant_id()
         OR customer_id IN (
           SELECT id FROM customers WHERE auth_user_id = auth.uid()
         )
    )
  );
