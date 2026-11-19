CREATE OR REPLACE FUNCTION public.has_any_role(_user_id uuid, _roles text[])
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = ANY(_roles))
$$;
GRANT EXECUTE ON FUNCTION public.has_any_role(uuid, text[]) TO authenticated;

CREATE SEQUENCE public.member_code_seq;
CREATE TABLE public.members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  member_code text NOT NULL UNIQUE DEFAULT ('MEM-' || lpad(nextval('public.member_code_seq')::text, 4, '0')),
  full_name text NOT NULL,
  phone_number text NOT NULL UNIQUE CHECK (phone_number ~ '^255[0-9]{9}$'),
  zone_or_group text,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.members TO authenticated;
GRANT ALL ON public.members TO service_role;
GRANT USAGE ON SEQUENCE public.member_code_seq TO authenticated, service_role;
ALTER TABLE public.members ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Staff read members" ON public.members FOR SELECT TO authenticated
  USING (public.has_any_role(auth.uid(), ARRAY['head_treasurer','assistant_treasurer','auditor','super_admin','admin']));
CREATE POLICY "Treasurers add members" ON public.members FOR INSERT TO authenticated
  WITH CHECK (public.has_any_role(auth.uid(), ARRAY['head_treasurer','assistant_treasurer','super_admin','admin']));
CREATE POLICY "Treasurers edit members" ON public.members FOR UPDATE TO authenticated
  USING (public.has_any_role(auth.uid(), ARRAY['head_treasurer','assistant_treasurer','super_admin','admin']));

CREATE TABLE public.offering_categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE,
  code text NOT NULL UNIQUE,
  description text,
  local_church_share numeric NOT NULL CHECK (local_church_share BETWEEN 0 AND 100),
  conference_share numeric NOT NULL CHECK (conference_share BETWEEN 0 AND 100),
  is_active boolean NOT NULL DEFAULT true,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  CHECK (local_church_share + conference_share = 100)
);
GRANT SELECT ON public.offering_categories TO anon;
GRANT SELECT, INSERT, UPDATE ON public.offering_categories TO authenticated;
GRANT ALL ON public.offering_categories TO service_role;
ALTER TABLE public.offering_categories ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone reads active categories" ON public.offering_categories FOR SELECT TO anon USING (is_active);
CREATE POLICY "Signed in read categories" ON public.offering_categories FOR SELECT TO authenticated USING (true);
CREATE POLICY "Head adds categories" ON public.offering_categories FOR INSERT TO authenticated
  WITH CHECK (public.has_any_role(auth.uid(), ARRAY['head_treasurer','super_admin']));
CREATE POLICY "Head edits categories" ON public.offering_categories FOR UPDATE TO authenticated
  USING (public.has_any_role(auth.uid(), ARRAY['head_treasurer','super_admin']));
INSERT INTO public.offering_categories (name, code, local_church_share, conference_share) VALUES
 ('RM','RM',100,0),('Zaka (Tithe)','ZAKA',0,100),('Sadaka ya Kawaida','SADAKA',50,50),('Ujenzi','UJENZI',100,0);

CREATE TABLE public.transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  receipt_number text NOT NULL UNIQUE,
  member_id uuid NOT NULL REFERENCES public.members(id),
  total_amount numeric NOT NULL CHECK (total_amount > 0),
  payment_method text NOT NULL CHECK (payment_method IN ('Cash','M-Pesa','Mixx by Yas','Airtel Money','HaloPesa','Bank Transfer','Online Portal')),
  transaction_date date NOT NULL DEFAULT current_date,
  status text NOT NULL DEFAULT 'completed' CHECK (status IN ('completed','void_requested','voided')),
  void_reason text,
  sms_status text NOT NULL DEFAULT 'pending' CHECK (sms_status IN ('pending','sent','failed')),
  sms_response text,
  recorded_by uuid,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX ON public.transactions (transaction_date);
CREATE INDEX ON public.transactions (member_id);
GRANT SELECT ON public.transactions TO authenticated;
GRANT ALL ON public.transactions TO service_role;
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Staff read transactions" ON public.transactions FOR SELECT TO authenticated
  USING (public.has_any_role(auth.uid(), ARRAY['head_treasurer','assistant_treasurer','auditor','super_admin','admin']));

CREATE TABLE public.transaction_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  transaction_id uuid NOT NULL REFERENCES public.transactions(id) ON DELETE CASCADE,
  category_id uuid NOT NULL REFERENCES public.offering_categories(id),
  amount numeric NOT NULL CHECK (amount > 0),
  local_church_amount numeric NOT NULL,
  conference_amount numeric NOT NULL
);
CREATE INDEX ON public.transaction_items (transaction_id);
GRANT SELECT ON public.transaction_items TO authenticated;
GRANT ALL ON public.transaction_items TO service_role;
ALTER TABLE public.transaction_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Staff read items" ON public.transaction_items FOR SELECT TO authenticated
  USING (public.has_any_role(auth.uid(), ARRAY['head_treasurer','assistant_treasurer','auditor','super_admin','admin']));

CREATE TABLE public.audit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid,
  action text NOT NULL,
  entity_type text NOT NULL,
  entity_id uuid,
  details jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.audit_logs TO authenticated;
GRANT ALL ON public.audit_logs TO service_role;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Staff read audit" ON public.audit_logs FOR SELECT TO authenticated
  USING (public.has_any_role(auth.uid(), ARRAY['head_treasurer','auditor','super_admin','admin']));

CREATE TABLE public.receipt_counters (year int PRIMARY KEY, last_value int NOT NULL DEFAULT 0);
GRANT ALL ON public.receipt_counters TO service_role;
ALTER TABLE public.receipt_counters ENABLE ROW LEVEL SECURITY;

-- Atomic recording: computes splits and sequential receipt number. Caller must be a treasurer, or service role (online portal).
CREATE OR REPLACE FUNCTION public.record_offering(_member_id uuid, _date date, _method text, _items jsonb, _notes text DEFAULT NULL)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _tx uuid; _yr int := extract(year from _date)::int; _n int; _total numeric; _uid uuid := auth.uid();
BEGIN
  IF _uid IS NOT NULL AND NOT public.has_any_role(_uid, ARRAY['head_treasurer','assistant_treasurer','super_admin','admin']) THEN
    RAISE EXCEPTION 'Huna ruhusa ya kurekodi sadaka';
  END IF;
  IF _uid IS NULL AND current_setting('request.jwt.claim.role', true) IS DISTINCT FROM 'service_role' AND current_user <> 'service_role' AND current_user <> 'postgres' THEN
    RAISE EXCEPTION 'Huna ruhusa';
  END IF;
  SELECT coalesce(sum((i->>'amount')::numeric),0) INTO _total FROM jsonb_array_elements(_items) i WHERE (i->>'amount')::numeric > 0;
  IF _total <= 0 THEN RAISE EXCEPTION 'Kiasi lazima kiwe zaidi ya 0'; END IF;
  INSERT INTO public.receipt_counters(year,last_value) VALUES (_yr,1)
    ON CONFLICT (year) DO UPDATE SET last_value = receipt_counters.last_value + 1 RETURNING last_value INTO _n;
  INSERT INTO public.transactions(receipt_number, member_id, total_amount, payment_method, transaction_date, recorded_by, notes)
    VALUES ('RM-'||_yr||'-'||lpad(_n::text,5,'0'), _member_id, _total, _method, _date, _uid, _notes) RETURNING id INTO _tx;
  INSERT INTO public.transaction_items(transaction_id, category_id, amount, local_church_amount, conference_amount)
    SELECT _tx, c.id, (i->>'amount')::numeric,
      round((i->>'amount')::numeric * c.local_church_share / 100, 2),
      (i->>'amount')::numeric - round((i->>'amount')::numeric * c.local_church_share / 100, 2)
    FROM jsonb_array_elements(_items) i JOIN public.offering_categories c ON c.id = (i->>'category_id')::uuid
    WHERE (i->>'amount')::numeric > 0;
  INSERT INTO public.audit_logs(user_id, action, entity_type, entity_id, details)
    VALUES (_uid, 'record_offering', 'transaction', _tx, jsonb_build_object('total', _total, 'method', _method));
  RETURN _tx;
END $$;
REVOKE ALL ON FUNCTION public.record_offering(uuid, date, text, jsonb, text) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.record_offering(uuid, date, text, jsonb, text) TO authenticated, service_role;

CREATE OR REPLACE FUNCTION public.request_void(_tx uuid, _reason text)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT public.has_any_role(auth.uid(), ARRAY['head_treasurer','assistant_treasurer','super_admin','admin']) THEN RAISE EXCEPTION 'Huna ruhusa'; END IF;
  IF coalesce(trim(_reason),'') = '' THEN RAISE EXCEPTION 'Sababu inahitajika'; END IF;
  UPDATE public.transactions SET status='void_requested', void_reason=_reason WHERE id=_tx AND status='completed';
  INSERT INTO public.audit_logs(user_id, action, entity_type, entity_id, details) VALUES (auth.uid(),'request_void','transaction',_tx,jsonb_build_object('reason',_reason));
END $$;
GRANT EXECUTE ON FUNCTION public.request_void(uuid, text) TO authenticated;

CREATE OR REPLACE FUNCTION public.decide_void(_tx uuid, _approve boolean)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT public.has_any_role(auth.uid(), ARRAY['head_treasurer','super_admin']) THEN RAISE EXCEPTION 'Mhazini Mkuu tu'; END IF;
  UPDATE public.transactions SET status = CASE WHEN _approve THEN 'voided' ELSE 'completed' END WHERE id=_tx AND status='void_requested';
  INSERT INTO public.audit_logs(user_id, action, entity_type, entity_id) VALUES (auth.uid(), CASE WHEN _approve THEN 'approve_void' ELSE 'reject_void' END,'transaction',_tx);
END $$;
GRANT EXECUTE ON FUNCTION public.decide_void(uuid, boolean) TO authenticated;