-- 1. order_items: validate price and name against menu_items
DROP POLICY IF EXISTS "anyone can add order items" ON public.order_items;
CREATE POLICY "anyone can add order items"
ON public.order_items FOR INSERT
WITH CHECK (
  quantity >= 1 AND quantity <= 50
  AND EXISTS (
    SELECT 1 FROM public.orders o
    WHERE o.id = order_items.order_id
      AND o.status = 'pending'::order_status
      AND o.created_at > now() - interval '5 minutes'
  )
  AND EXISTS (
    SELECT 1 FROM public.menu_items m
    WHERE m.id = order_items.menu_item_id
      AND m.is_available = true
      AND m.price = order_items.unit_price
      AND m.name = order_items.name_snapshot
  )
);

-- 2. orders.total must be server-computed
DROP POLICY IF EXISTS "anyone can place orders" ON public.orders;
CREATE POLICY "anyone can place orders"
ON public.orders FOR INSERT
WITH CHECK (
  table_number >= 1 AND table_number <= 999
  AND status = 'pending'::order_status
  AND call_waiter = false
  AND request_bill = false
  AND total = 0
);

CREATE OR REPLACE FUNCTION public.recalc_order_total()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.orders o
  SET total = COALESCE((
    SELECT SUM(oi.unit_price * oi.quantity)
    FROM public.order_items oi
    WHERE oi.order_id = o.id
  ), 0)
  WHERE o.id = NEW.order_id;
  RETURN NEW;
END;
$$;
REVOKE ALL ON FUNCTION public.recalc_order_total() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS order_items_recalc_total ON public.order_items;
CREATE TRIGGER order_items_recalc_total
AFTER INSERT ON public.order_items
FOR EACH ROW EXECUTE FUNCTION public.recalc_order_total();

-- 3. scoped customer read path for recent orders (no PII stored on these rows)
DROP POLICY IF EXISTS "customers read recent orders" ON public.orders;
CREATE POLICY "customers read recent orders"
ON public.orders FOR SELECT TO anon
USING (created_at > now() - interval '4 hours');

DROP POLICY IF EXISTS "customers read recent order items" ON public.order_items;
CREATE POLICY "customers read recent order items"
ON public.order_items FOR SELECT TO anon
USING (EXISTS (
  SELECT 1 FROM public.orders o
  WHERE o.id = order_items.order_id
    AND o.created_at > now() - interval '4 hours'
));

-- 4. lock down SECURITY DEFINER functions
REVOKE ALL ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.set_updated_at() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.has_role(uuid, app_role) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.has_role(uuid, app_role) TO authenticated;
REVOKE ALL ON FUNCTION public.call_waiter(integer) FROM authenticated;
REVOKE ALL ON FUNCTION public.request_bill(integer) FROM authenticated;

-- staff policies only need to be evaluated for signed-in users
DROP POLICY IF EXISTS "staff read orders" ON public.orders;
CREATE POLICY "staff read orders" ON public.orders FOR SELECT TO authenticated
USING (has_role(auth.uid(), 'chef'::app_role) OR has_role(auth.uid(), 'owner'::app_role));
DROP POLICY IF EXISTS "staff update orders" ON public.orders;
CREATE POLICY "staff update orders" ON public.orders FOR UPDATE TO authenticated
USING (has_role(auth.uid(), 'chef'::app_role) OR has_role(auth.uid(), 'owner'::app_role));
DROP POLICY IF EXISTS "staff read order items" ON public.order_items;
CREATE POLICY "staff read order items" ON public.order_items FOR SELECT TO authenticated
USING (has_role(auth.uid(), 'chef'::app_role) OR has_role(auth.uid(), 'owner'::app_role));
DROP POLICY IF EXISTS "staff read feedback" ON public.feedback;
CREATE POLICY "staff read feedback" ON public.feedback FOR SELECT TO authenticated
USING (has_role(auth.uid(), 'owner'::app_role) OR has_role(auth.uid(), 'chef'::app_role));
DROP POLICY IF EXISTS "chefs toggle availability" ON public.menu_items;
CREATE POLICY "chefs toggle availability" ON public.menu_items FOR UPDATE TO authenticated
USING (has_role(auth.uid(), 'chef'::app_role)) WITH CHECK (has_role(auth.uid(), 'chef'::app_role));
DROP POLICY IF EXISTS "owners manage menu" ON public.menu_items;
CREATE POLICY "owners manage menu" ON public.menu_items FOR ALL TO authenticated
USING (has_role(auth.uid(), 'owner'::app_role)) WITH CHECK (has_role(auth.uid(), 'owner'::app_role));
DROP POLICY IF EXISTS "owners manage roles" ON public.user_roles;
CREATE POLICY "owners manage roles" ON public.user_roles FOR ALL TO authenticated
USING (has_role(auth.uid(), 'owner'::app_role)) WITH CHECK (has_role(auth.uid(), 'owner'::app_role));
DROP POLICY IF EXISTS "staff view all profiles" ON public.profiles;
CREATE POLICY "staff view all profiles" ON public.profiles FOR SELECT TO authenticated
USING (has_role(auth.uid(), 'owner'::app_role) OR has_role(auth.uid(), 'chef'::app_role));

GRANT SELECT ON public.orders TO anon;
GRANT SELECT ON public.order_items TO anon;