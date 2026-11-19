ALTER TABLE public.profiles ADD COLUMN active boolean NOT NULL DEFAULT true;
ALTER TABLE public.profiles ADD COLUMN role text;

CREATE TABLE public.user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);
GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Own roles read" ON public.user_roles FOR SELECT TO authenticated USING (auth.uid() = user_id);

CREATE TABLE public.rbac_user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  role_key text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, role_key)
);
GRANT SELECT ON public.rbac_user_roles TO authenticated;
GRANT ALL ON public.rbac_user_roles TO service_role;
ALTER TABLE public.rbac_user_roles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Own rbac roles read" ON public.rbac_user_roles FOR SELECT TO authenticated USING (auth.uid() = user_id);