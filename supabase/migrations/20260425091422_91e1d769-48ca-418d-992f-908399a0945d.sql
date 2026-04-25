
-- Fix search_path on set_updated_at
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$;

-- Tighten anonymous insert policies
DROP POLICY "anyone can place orders" ON public.orders;
CREATE POLICY "anyone can place orders" ON public.orders
  FOR INSERT
  WITH CHECK (
    table_number BETWEEN 1 AND 999
    AND status = 'pending'
    AND call_waiter = false
    AND request_bill = false
  );

DROP POLICY "anyone can add order items" ON public.order_items;
CREATE POLICY "anyone can add order items" ON public.order_items
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.orders o
      WHERE o.id = order_items.order_id
        AND o.status = 'pending'
        AND o.created_at > now() - interval '5 minutes'
    )
    AND quantity BETWEEN 1 AND 50
  );
