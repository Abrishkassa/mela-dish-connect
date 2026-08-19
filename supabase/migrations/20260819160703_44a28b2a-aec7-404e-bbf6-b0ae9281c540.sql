REVOKE ALL ON FUNCTION public.call_waiter(integer) FROM PUBLIC, authenticated;
REVOKE ALL ON FUNCTION public.request_bill(integer) FROM PUBLIC, authenticated;
GRANT EXECUTE ON FUNCTION public.call_waiter(integer) TO anon;
GRANT EXECUTE ON FUNCTION public.request_bill(integer) TO anon;