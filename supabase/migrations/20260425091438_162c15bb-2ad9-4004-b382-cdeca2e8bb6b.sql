
CREATE OR REPLACE FUNCTION public.call_waiter(p_table_number INT)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF p_table_number IS NULL OR p_table_number < 1 OR p_table_number > 999 THEN
    RAISE EXCEPTION 'invalid table number';
  END IF;
  -- Insert a flag-only order row so kitchen sees it
  INSERT INTO public.orders (table_number, status, call_waiter, total)
  VALUES (p_table_number, 'pending', true, 0);
END;
$$;

CREATE OR REPLACE FUNCTION public.request_bill(p_table_number INT)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF p_table_number IS NULL OR p_table_number < 1 OR p_table_number > 999 THEN
    RAISE EXCEPTION 'invalid table number';
  END IF;
  INSERT INTO public.orders (table_number, status, request_bill, total)
  VALUES (p_table_number, 'pending', true, 0);
END;
$$;

GRANT EXECUTE ON FUNCTION public.call_waiter(INT) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.request_bill(INT) TO anon, authenticated;
