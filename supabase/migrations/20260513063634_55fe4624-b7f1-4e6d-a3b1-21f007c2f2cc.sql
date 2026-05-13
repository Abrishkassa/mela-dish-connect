
-- Fix missing pairing on existing item
UPDATE public.menu_items
SET recommended_item_id = 'f4169876-468c-48a5-b984-b74663d57d1d' -- St. George Beer
WHERE id = 'd180c59a-a4e2-47fe-ac08-eec04f185b93'; -- Hawassa Carpaccio

-- Seed new drinks (soft + hot) so we can pair to them
INSERT INTO public.menu_items (id, name, description, category, price, is_drink, is_available, sort_order)
VALUES
  ('11111111-1111-1111-1111-111111111101'::uuid,
   '{"en":"Fresh Mango Juice","am":"የማንጎ ጭማቂ","sid":"Mango juice"}'::jsonb,
   '{"en":"Cold-pressed mango, no added sugar.","am":"","sid":""}'::jsonb,
   'soft drinks', 90, true, true, 10),
  ('11111111-1111-1111-1111-111111111102'::uuid,
   '{"en":"Sparkling Ambo Water","am":"አምቦ ውሃ","sid":"Ambo water"}'::jsonb,
   '{"en":"Naturally sparkling Ethiopian mineral water.","am":"","sid":""}'::jsonb,
   'soft drinks', 60, true, true, 11),
  ('11111111-1111-1111-1111-111111111103'::uuid,
   '{"en":"Macchiato","am":"ማኪያቶ","sid":"Macchiato"}'::jsonb,
   '{"en":"Espresso topped with steamed milk.","am":"","sid":""}'::jsonb,
   'hot drinks', 70, true, true, 20),
  ('11111111-1111-1111-1111-111111111104'::uuid,
   '{"en":"Spiced Tea (Shai)","am":"ሻይ","sid":"Shai"}'::jsonb,
   '{"en":"Black tea with cardamom and clove.","am":"","sid":""}'::jsonb,
   'hot drinks', 50, true, true, 21);

-- Seed breakfast items (paired with hot drinks)
INSERT INTO public.menu_items (id, name, description, category, price, is_drink, is_available, sort_order, recommended_item_id)
VALUES
  ('22222222-2222-2222-2222-222222222201'::uuid,
   '{"en":"Ful Medames","am":"ፉል","sid":"Ful"}'::jsonb,
   '{"en":"Slow-cooked fava beans with onion, tomato and chili.","am":"","sid":""}'::jsonb,
   'breakfast', 140, false, true, 1,
   '11111111-1111-1111-1111-111111111103'::uuid),
  ('22222222-2222-2222-2222-222222222202'::uuid,
   '{"en":"Chechebsa","am":"ጨጨብሳ","sid":"Chechebsa"}'::jsonb,
   '{"en":"Shredded flatbread tossed in spiced butter and berbere.","am":"","sid":""}'::jsonb,
   'breakfast', 130, false, true, 2,
   '11111111-1111-1111-1111-111111111104'::uuid),
  ('22222222-2222-2222-2222-222222222203'::uuid,
   '{"en":"Enkulal Firfir","am":"እንቁላል ፍርፍር","sid":"Egg firfir"}'::jsonb,
   '{"en":"Scrambled eggs with injera, onion and jalapeño.","am":"","sid":""}'::jsonb,
   'breakfast', 160, false, true, 3,
   'fe56ae18-5c4a-45a0-96ed-bd82b0178bcf'::uuid); -- Buna

-- Seed lunch items
INSERT INTO public.menu_items (id, name, description, category, price, is_drink, is_available, sort_order, recommended_item_id)
VALUES
  ('33333333-3333-3333-3333-333333333301'::uuid,
   '{"en":"Beyaynetu Platter","am":"በያይነቱ","sid":"Beyaynetu"}'::jsonb,
   '{"en":"Assorted vegan stews on injera — shiro, misir, gomen, atkilt.","am":"","sid":""}'::jsonb,
   'lunch', 220, false, true, 1,
   '11111111-1111-1111-1111-111111111101'::uuid),
  ('33333333-3333-3333-3333-333333333302'::uuid,
   '{"en":"Chicken Sandwich","am":"የዶሮ ሳንድዊች","sid":"Chicken sandwich"}'::jsonb,
   '{"en":"Grilled chicken, lettuce, tomato on toasted bun.","am":"","sid":""}'::jsonb,
   'lunch', 180, false, true, 2,
   '11111111-1111-1111-1111-111111111102'::uuid),
  ('33333333-3333-3333-3333-333333333303'::uuid,
   '{"en":"Pasta Arrabiata","am":"ፓስታ","sid":"Pasta"}'::jsonb,
   '{"en":"Penne in spicy tomato sauce with basil.","am":"","sid":""}'::jsonb,
   'lunch', 200, false, true, 3,
   '11111111-1111-1111-1111-111111111101'::uuid);

-- Seed dinner items
INSERT INTO public.menu_items (id, name, description, category, price, is_drink, is_available, sort_order, recommended_item_id)
VALUES
  ('44444444-4444-4444-4444-444444444401'::uuid,
   '{"en":"Mixed Grill Tibs","am":"ድብልቅ ጥብስ","sid":"Mixed tibs"}'::jsonb,
   '{"en":"Beef and lamb tibs with rosemary, onion and pepper.","am":"","sid":""}'::jsonb,
   'dinner', 320, false, true, 1,
   'f4169876-468c-48a5-b984-b74663d57d1d'::uuid), -- St. George Beer
  ('44444444-4444-4444-4444-444444444402'::uuid,
   '{"en":"Yebeg Wat","am":"የበግ ወጥ","sid":"Lamb wat"}'::jsonb,
   '{"en":"Slow-braised lamb in berbere sauce.","am":"","sid":""}'::jsonb,
   'dinner', 340, false, true, 2,
   '775aefa3-7e99-4cae-890e-dccf38a76627'::uuid), -- Tej
  ('44444444-4444-4444-4444-444444444403'::uuid,
   '{"en":"Grilled Sea Bass","am":"የባህር ዓሳ","sid":"Sea bass"}'::jsonb,
   '{"en":"Whole fish, lemon, herbs, served with rice.","am":"","sid":""}'::jsonb,
   'dinner', 380, false, true, 3,
   'cd9e4e61-ae1a-44ed-b56a-8b034239ff96'::uuid); -- Spris
