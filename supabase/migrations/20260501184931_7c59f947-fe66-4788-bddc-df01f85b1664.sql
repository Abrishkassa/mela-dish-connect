CREATE TABLE public.feedback (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  order_id UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  table_number INTEGER NOT NULL,
  rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
  meal_comment TEXT,
  restaurant_comment TEXT,
  system_comment TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_feedback_order_id ON public.feedback(order_id);
CREATE INDEX idx_feedback_created_at ON public.feedback(created_at DESC);

ALTER TABLE public.feedback ENABLE ROW LEVEL SECURITY;

-- Anyone (anonymous customer) can submit feedback for a served order
CREATE POLICY "anyone can submit feedback for served orders"
ON public.feedback
FOR INSERT
TO public
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.orders o
    WHERE o.id = feedback.order_id
      AND o.status = 'served'
      AND o.table_number = feedback.table_number
  )
);

-- Staff (owner or chef) can read all feedback
CREATE POLICY "staff read feedback"
ON public.feedback
FOR SELECT
TO public
USING (
  public.has_role(auth.uid(), 'owner'::app_role)
  OR public.has_role(auth.uid(), 'chef'::app_role)
);