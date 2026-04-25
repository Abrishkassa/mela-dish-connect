
-- =========================================================
-- Mela Digital Menu System — Schema
-- =========================================================

-- 1. Roles enum + user_roles table (security best practice)
CREATE TYPE public.app_role AS ENUM ('owner', 'chef', 'customer');

CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.app_role NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);

ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Security definer function to check roles (avoids RLS recursion)
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role public.app_role)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  )
$$;

-- 2. Profiles (name + display)
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Auto-create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'full_name', ''));
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 3. Menu Items (multi-language name + description as jsonb)
CREATE TABLE public.menu_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name JSONB NOT NULL,                  -- {en, am, sid}
  description JSONB NOT NULL DEFAULT '{}'::jsonb,
  category TEXT NOT NULL,               -- 'mains' | 'starters' | 'drinks' | 'desserts'
  price NUMERIC(10,2) NOT NULL CHECK (price >= 0),
  image_url TEXT,
  is_available BOOLEAN NOT NULL DEFAULT true,
  is_drink BOOLEAN NOT NULL DEFAULT false,
  recommended_item_id UUID REFERENCES public.menu_items(id) ON DELETE SET NULL,
  sort_order INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.menu_items ENABLE ROW LEVEL SECURITY;

-- 4. Orders
CREATE TYPE public.order_status AS ENUM ('pending', 'cooking', 'served', 'cancelled');

CREATE TABLE public.orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  table_number INT NOT NULL CHECK (table_number > 0),
  status public.order_status NOT NULL DEFAULT 'pending',
  notes TEXT,
  total NUMERIC(10,2) NOT NULL DEFAULT 0,
  call_waiter BOOLEAN NOT NULL DEFAULT false,
  request_bill BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.order_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  menu_item_id UUID NOT NULL REFERENCES public.menu_items(id),
  name_snapshot JSONB NOT NULL,
  unit_price NUMERIC(10,2) NOT NULL,
  quantity INT NOT NULL CHECK (quantity > 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.order_items ENABLE ROW LEVEL SECURITY;

-- =========================================================
-- RLS Policies
-- =========================================================

-- user_roles: users see their own roles; only owners can manage
CREATE POLICY "users see own roles" ON public.user_roles
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "owners manage roles" ON public.user_roles
  FOR ALL USING (public.has_role(auth.uid(), 'owner'))
  WITH CHECK (public.has_role(auth.uid(), 'owner'));
-- allow insert during signup edge function (uses service role; bypasses RLS)

-- profiles
CREATE POLICY "users view own profile" ON public.profiles
  FOR SELECT USING (auth.uid() = id);
CREATE POLICY "users update own profile" ON public.profiles
  FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "staff view all profiles" ON public.profiles
  FOR SELECT USING (public.has_role(auth.uid(), 'owner') OR public.has_role(auth.uid(), 'chef'));

-- menu_items: PUBLIC READ (customers scan QR with no login)
CREATE POLICY "anyone can read menu" ON public.menu_items
  FOR SELECT USING (true);
CREATE POLICY "owners manage menu" ON public.menu_items
  FOR ALL USING (public.has_role(auth.uid(), 'owner'))
  WITH CHECK (public.has_role(auth.uid(), 'owner'));
CREATE POLICY "chefs toggle availability" ON public.menu_items
  FOR UPDATE USING (public.has_role(auth.uid(), 'chef'))
  WITH CHECK (public.has_role(auth.uid(), 'chef'));

-- orders: PUBLIC INSERT (customer places order without account); staff read/update
CREATE POLICY "anyone can place orders" ON public.orders
  FOR INSERT WITH CHECK (true);
CREATE POLICY "staff read orders" ON public.orders
  FOR SELECT USING (public.has_role(auth.uid(), 'chef') OR public.has_role(auth.uid(), 'owner'));
CREATE POLICY "staff update orders" ON public.orders
  FOR UPDATE USING (public.has_role(auth.uid(), 'chef') OR public.has_role(auth.uid(), 'owner'));

CREATE POLICY "anyone can add order items" ON public.order_items
  FOR INSERT WITH CHECK (true);
CREATE POLICY "staff read order items" ON public.order_items
  FOR SELECT USING (public.has_role(auth.uid(), 'chef') OR public.has_role(auth.uid(), 'owner'));

-- =========================================================
-- Realtime: enable on orders + menu_items
-- =========================================================
ALTER TABLE public.orders REPLICA IDENTITY FULL;
ALTER TABLE public.order_items REPLICA IDENTITY FULL;
ALTER TABLE public.menu_items REPLICA IDENTITY FULL;

ALTER PUBLICATION supabase_realtime ADD TABLE public.orders;
ALTER PUBLICATION supabase_realtime ADD TABLE public.order_items;
ALTER PUBLICATION supabase_realtime ADD TABLE public.menu_items;

-- updated_at trigger helper
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;

CREATE TRIGGER menu_items_updated_at BEFORE UPDATE ON public.menu_items
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER orders_updated_at BEFORE UPDATE ON public.orders
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
