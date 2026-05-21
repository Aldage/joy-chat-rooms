
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS active_minutes integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS last_daily_bonus_at timestamptz;

-- Daily login bonus
CREATE OR REPLACE FUNCTION public.claim_daily_bonus()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  uid uuid := auth.uid();
  last_at timestamptz;
  bonus integer := 100;
BEGIN
  IF uid IS NULL THEN RAISE EXCEPTION 'not authenticated'; END IF;

  SELECT last_daily_bonus_at INTO last_at FROM public.profiles WHERE id = uid FOR UPDATE;

  IF last_at IS NOT NULL AND last_at::date = current_date THEN
    RETURN 0;
  END IF;

  UPDATE public.profiles
     SET coin_balance = coin_balance + bonus,
         last_daily_bonus_at = now(),
         updated_at = now()
   WHERE id = uid;

  INSERT INTO public.coin_transactions (user_id, amount, type, description)
  VALUES (uid, bonus, 'purchase'::coin_tx_type, 'Daily login bonus');

  RETURN bonus;
END;
$$;

-- Award 1 active minute + 5 XP for being in a room
CREATE OR REPLACE FUNCTION public.award_room_minute(_room_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE uid uuid := auth.uid();
BEGIN
  IF uid IS NULL THEN RAISE EXCEPTION 'not authenticated'; END IF;
  IF NOT EXISTS (SELECT 1 FROM public.rooms WHERE id = _room_id AND is_active = true) THEN
    RAISE EXCEPTION 'room not found';
  END IF;

  UPDATE public.profiles
     SET active_minutes = active_minutes + 1,
         xp = xp + 5,
         updated_at = now()
   WHERE id = uid;
END;
$$;

-- Most active leaderboard
CREATE OR REPLACE FUNCTION public.get_active_leaderboard()
RETURNS TABLE (id uuid, display_name text, avatar_url text, active_minutes integer, xp integer)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT id, display_name, avatar_url, active_minutes, xp
  FROM public.profiles
  ORDER BY active_minutes DESC, xp DESC
  LIMIT 10;
$$;

-- Gift receiver gains XP equal to gift cost
CREATE OR REPLACE FUNCTION public.apply_gift_transaction()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE sender_balance INTEGER;
BEGIN
  SELECT coin_balance INTO sender_balance FROM public.profiles WHERE id = NEW.sender_id FOR UPDATE;
  IF sender_balance IS NULL OR sender_balance < NEW.total_cost THEN
    RAISE EXCEPTION 'Yetersiz bakiye';
  END IF;
  UPDATE public.profiles
     SET coin_balance = coin_balance - NEW.total_cost, updated_at = now()
   WHERE id = NEW.sender_id;
  UPDATE public.profiles
     SET coins_earned = coins_earned + NEW.total_cost,
         coin_balance = coin_balance + NEW.total_cost,
         xp = xp + NEW.total_cost,
         updated_at = now()
   WHERE id = NEW.receiver_id;
  RETURN NEW;
END;
$$;
