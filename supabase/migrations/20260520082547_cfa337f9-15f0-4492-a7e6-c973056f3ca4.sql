-- Room popularity (global trend fire) — shared across users
ALTER TABLE public.rooms ADD COLUMN IF NOT EXISTS popularity integer NOT NULL DEFAULT 0;

-- Active cosmetics on profile
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS active_frame text;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS active_entry_effect text;

-- Owned store items (frames, entry effects, …)
CREATE TABLE IF NOT EXISTS public.user_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  item_id text NOT NULL,
  item_type text NOT NULL, -- 'frame' | 'entry'
  acquired_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz,
  UNIQUE(user_id, item_id)
);

ALTER TABLE public.user_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own items"
  ON public.user_items FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users insert own items"
  ON public.user_items FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users update own items"
  ON public.user_items FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id);

-- RPC: atomically bump a room's popularity by N (anyone in any room can pump trend)
CREATE OR REPLACE FUNCTION public.bump_room_popularity(_room_id uuid, _delta integer)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE new_val integer;
BEGIN
  IF _delta IS NULL OR _delta <= 0 OR _delta > 500 THEN
    RAISE EXCEPTION 'invalid delta';
  END IF;
  UPDATE public.rooms
     SET popularity = popularity + _delta
   WHERE id = _room_id AND is_active = true
   RETURNING popularity INTO new_val;
  RETURN new_val;
END;
$$;

GRANT EXECUTE ON FUNCTION public.bump_room_popularity(uuid, integer) TO authenticated;

-- RPC: spend coins to buy a store item (atomic)
CREATE OR REPLACE FUNCTION public.purchase_store_item(_item_id text, _item_type text, _cost integer)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  uid uuid := auth.uid();
  bal integer;
BEGIN
  IF uid IS NULL THEN RAISE EXCEPTION 'not authenticated'; END IF;
  IF _cost IS NULL OR _cost <= 0 THEN RAISE EXCEPTION 'invalid cost'; END IF;
  IF _item_type NOT IN ('frame','entry') THEN RAISE EXCEPTION 'invalid type'; END IF;

  SELECT coin_balance INTO bal FROM public.profiles WHERE id = uid FOR UPDATE;
  IF bal IS NULL OR bal < _cost THEN RAISE EXCEPTION 'Yetersiz bakiye'; END IF;

  UPDATE public.profiles
     SET coin_balance = coin_balance - _cost, updated_at = now()
   WHERE id = uid;

  INSERT INTO public.user_items (user_id, item_id, item_type)
  VALUES (uid, _item_id, _item_type)
  ON CONFLICT (user_id, item_id) DO NOTHING;
END;
$$;

GRANT EXECUTE ON FUNCTION public.purchase_store_item(text, text, integer) TO authenticated;