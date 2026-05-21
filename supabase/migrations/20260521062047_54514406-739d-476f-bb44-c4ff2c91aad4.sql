
-- ============================================================
-- 1. ROOMS: hide password column, add has_password flag
-- ============================================================
ALTER TABLE public.rooms
  ADD COLUMN IF NOT EXISTS has_password boolean
  GENERATED ALWAYS AS (password IS NOT NULL AND password <> '') STORED;

REVOKE SELECT ON public.rooms FROM anon, authenticated;
GRANT SELECT (id, title, tag, cover_url, seat_count, owner_id, description,
              popularity, is_active, created_at, has_password)
  ON public.rooms TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.rooms TO authenticated;

-- Owner-only password fetch
CREATE OR REPLACE FUNCTION public.get_room_password(_room_id uuid)
RETURNS text
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE p text;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'not authenticated'; END IF;
  SELECT password INTO p FROM public.rooms
    WHERE id = _room_id AND owner_id = auth.uid();
  IF NOT FOUND THEN RAISE EXCEPTION 'forbidden'; END IF;
  RETURN p;
END $$;

-- Anyone authenticated can verify a password to join
CREATE OR REPLACE FUNCTION public.verify_room_password(_room_id uuid, _password text)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.rooms
    WHERE id = _room_id
      AND (password IS NULL OR password = '' OR password = _password)
  )
$$;

-- ============================================================
-- 2. PROFILES: hide financials from anon; restrict updates
-- ============================================================
REVOKE SELECT ON public.profiles FROM anon;
GRANT SELECT (id, display_name, avatar_url, bio, active_frame,
              active_entry_effect, is_guest, created_at)
  ON public.profiles TO anon;

REVOKE UPDATE ON public.profiles FROM anon, authenticated, PUBLIC;
GRANT UPDATE (display_name, avatar_url, bio, active_frame,
              active_entry_effect, updated_at, xp)
  ON public.profiles TO authenticated;

-- ============================================================
-- 3. COIN_TRANSACTIONS & USER_ITEMS: remove direct INSERT
-- ============================================================
DROP POLICY IF EXISTS "Users insert own coin tx" ON public.coin_transactions;
DROP POLICY IF EXISTS "Users insert own items" ON public.user_items;
DROP POLICY IF EXISTS "Users update own items" ON public.user_items;

-- ============================================================
-- 4. New server-side coin/item helpers
-- ============================================================

-- Dice game: atomic balance update + audit + log
CREATE OR REPLACE FUNCTION public.play_dice(
  _bet integer,
  _result integer,
  _is_win boolean,
  _room_id uuid
)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  uid uuid := auth.uid();
  bal integer;
  delta integer;
BEGIN
  IF uid IS NULL THEN RAISE EXCEPTION 'not authenticated'; END IF;
  IF _bet IS NULL OR _bet <= 0 OR _bet > 1000 THEN RAISE EXCEPTION 'invalid bet'; END IF;
  IF _result < 1 OR _result > 6 THEN RAISE EXCEPTION 'invalid result'; END IF;

  delta := CASE WHEN _is_win THEN _bet ELSE -_bet END;

  SELECT coin_balance INTO bal FROM public.profiles WHERE id = uid FOR UPDATE;
  IF bal IS NULL OR bal + delta < 0 THEN RAISE EXCEPTION 'insufficient balance'; END IF;

  UPDATE public.profiles SET coin_balance = bal + delta, updated_at = now() WHERE id = uid;

  INSERT INTO public.dice_games (user_id, room_id, bet_amount, dice_result, is_win, reward_amount)
  VALUES (uid, _room_id, _bet, _result, _is_win, CASE WHEN _is_win THEN _bet ELSE 0 END);

  INSERT INTO public.coin_transactions (user_id, amount, type, description)
  VALUES (uid, delta, (CASE WHEN _is_win THEN 'dice_win' ELSE 'dice_bet' END)::coin_tx_type,
          'Dice ' || _result || ' (bet ' || _bet || ')');

  RETURN bal + delta;
END $$;

-- Demo top-up (replace with real payment integration later)
CREATE OR REPLACE FUNCTION public.topup_coins(_amount integer)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE uid uuid := auth.uid(); bal integer;
BEGIN
  IF uid IS NULL THEN RAISE EXCEPTION 'not authenticated'; END IF;
  IF _amount IS NULL OR _amount <= 0 OR _amount > 100000 THEN RAISE EXCEPTION 'invalid amount'; END IF;
  UPDATE public.profiles SET coin_balance = coin_balance + _amount, updated_at = now()
    WHERE id = uid RETURNING coin_balance INTO bal;
  INSERT INTO public.coin_transactions (user_id, amount, type, description)
  VALUES (uid, _amount, 'purchase'::coin_tx_type, 'Coin pack purchase');
  RETURN bal;
END $$;

-- Chest bonus
CREATE OR REPLACE FUNCTION public.award_chest_bonus(_room_id uuid, _amount integer DEFAULT 5)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE uid uuid := auth.uid(); bal integer;
BEGIN
  IF uid IS NULL THEN RAISE EXCEPTION 'not authenticated'; END IF;
  IF _amount IS NULL OR _amount <= 0 OR _amount > 50 THEN RAISE EXCEPTION 'invalid amount'; END IF;
  UPDATE public.profiles SET coin_balance = coin_balance + _amount, updated_at = now()
    WHERE id = uid RETURNING coin_balance INTO bal;
  INSERT INTO public.coin_transactions (user_id, amount, type, description)
  VALUES (uid, _amount, 'purchase'::coin_tx_type, 'Chest bonus');
  RETURN bal;
END $$;

-- ============================================================
-- 5. ROOM_SEATS: tighten permissive policies
-- ============================================================
DROP POLICY IF EXISTS "Auth insert seats" ON public.room_seats;
DROP POLICY IF EXISTS "Auth update seats" ON public.room_seats;

CREATE POLICY "Owner or admin insert seats"
  ON public.room_seats FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.rooms r WHERE r.id = room_id AND r.owner_id = auth.uid())
    OR public.has_role(auth.uid(), 'admin'::app_role)
  );

CREATE POLICY "Update seats - self, owner, admin, or empty seat"
  ON public.room_seats FOR UPDATE
  TO authenticated
  USING (
    user_id IS NULL
    OR user_id = auth.uid()
    OR EXISTS (SELECT 1 FROM public.rooms r WHERE r.id = room_id AND r.owner_id = auth.uid())
    OR public.has_role(auth.uid(), 'admin'::app_role)
  )
  WITH CHECK (
    user_id IS NULL
    OR user_id = auth.uid()
    OR EXISTS (SELECT 1 FROM public.rooms r WHERE r.id = room_id AND r.owner_id = auth.uid())
    OR public.has_role(auth.uid(), 'admin'::app_role)
  );

-- ============================================================
-- 6. REALTIME: require authenticated subscribers
-- ============================================================
ALTER TABLE IF EXISTS realtime.messages ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Authenticated can subscribe" ON realtime.messages;
CREATE POLICY "Authenticated can subscribe"
  ON realtime.messages FOR SELECT
  TO authenticated
  USING (true);

-- ============================================================
-- 7. Revoke EXECUTE from anon/PUBLIC on privileged functions
-- ============================================================
REVOKE EXECUTE ON FUNCTION public.has_role(uuid, app_role) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.purchase_store_item(text, text, integer) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.bump_room_popularity(uuid, integer) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.get_room_password(uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.verify_room_password(uuid, text) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.play_dice(integer, integer, boolean, uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.topup_coins(integer) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.award_chest_bonus(uuid, integer) FROM PUBLIC, anon;

GRANT EXECUTE ON FUNCTION public.has_role(uuid, app_role) TO authenticated;
GRANT EXECUTE ON FUNCTION public.purchase_store_item(text, text, integer) TO authenticated;
GRANT EXECUTE ON FUNCTION public.bump_room_popularity(uuid, integer) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_room_password(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.verify_room_password(uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.play_dice(integer, integer, boolean, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.topup_coins(integer) TO authenticated;
GRANT EXECUTE ON FUNCTION public.award_chest_bonus(uuid, integer) TO authenticated;
