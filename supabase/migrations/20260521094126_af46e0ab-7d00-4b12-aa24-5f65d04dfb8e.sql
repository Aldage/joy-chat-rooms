
-- 1) Announcements table
CREATE TABLE public.announcements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  message text NOT NULL CHECK (length(message) BETWEEN 1 AND 500),
  level text NOT NULL DEFAULT 'info' CHECK (level IN ('info','warning','event')),
  created_by uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NOT NULL DEFAULT (now() + interval '24 hours'),
  is_active boolean NOT NULL DEFAULT true
);

ALTER TABLE public.announcements ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Announcements viewable by auth"
ON public.announcements FOR SELECT TO authenticated USING (true);

CREATE POLICY "Admins insert announcements"
ON public.announcements FOR INSERT TO authenticated
WITH CHECK (public.has_role(auth.uid(), 'admin') AND created_by = auth.uid());

CREATE POLICY "Admins update announcements"
ON public.announcements FOR UPDATE TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins delete announcements"
ON public.announcements FOR DELETE TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

ALTER PUBLICATION supabase_realtime ADD TABLE public.announcements;
ALTER TABLE public.announcements REPLICA IDENTITY FULL;

-- 2) Add XP gain to dice wins (atomic, server-side)
CREATE OR REPLACE FUNCTION public.play_dice(_bet integer, _result integer, _is_win boolean, _room_id uuid)
RETURNS integer
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
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

  UPDATE public.profiles
     SET coin_balance = bal + delta,
         xp = xp + (CASE WHEN _is_win THEN GREATEST(1, _bet / 20) ELSE 1 END),
         updated_at = now()
   WHERE id = uid;

  INSERT INTO public.dice_games (user_id, room_id, bet_amount, dice_result, is_win, reward_amount)
  VALUES (uid, _room_id, _bet, _result, _is_win, CASE WHEN _is_win THEN _bet ELSE 0 END);

  INSERT INTO public.coin_transactions (user_id, amount, type, description)
  VALUES (uid, delta, (CASE WHEN _is_win THEN 'dice_win' ELSE 'dice_bet' END)::coin_tx_type,
          'Dice ' || _result || ' (bet ' || _bet || ')');

  RETURN bal + delta;
END $$;

-- 3) Admin stats RPC: daily active users (last 14 days) + top rooms
CREATE OR REPLACE FUNCTION public.get_admin_stats()
RETURNS jsonb
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  result jsonb;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'forbidden';
  END IF;

  WITH days AS (
    SELECT generate_series(
      (current_date - interval '13 days')::date,
      current_date,
      '1 day'::interval
    )::date AS day
  ),
  active AS (
    SELECT date_trunc('day', created_at)::date AS day, COUNT(DISTINCT user_id) AS count
    FROM (
      SELECT user_id, created_at FROM public.coin_transactions
        WHERE created_at >= current_date - interval '13 days'
      UNION ALL
      SELECT user_id, played_at AS created_at FROM public.dice_games
        WHERE played_at >= current_date - interval '13 days'
      UNION ALL
      SELECT user_id, created_at FROM public.room_messages
        WHERE created_at >= current_date - interval '13 days'
    ) u
    GROUP BY 1
  ),
  daily AS (
    SELECT d.day, COALESCE(a.count, 0) AS count
    FROM days d LEFT JOIN active a ON a.day = d.day
    ORDER BY d.day
  ),
  top_rooms AS (
    SELECT r.id, r.title, r.popularity, r.tag, p.display_name AS owner_name
    FROM public.rooms r
    LEFT JOIN public.profiles p ON p.id = r.owner_id
    WHERE r.is_active = true
    ORDER BY r.popularity DESC, r.created_at DESC
    LIMIT 5
  )
  SELECT jsonb_build_object(
    'daily', COALESCE((SELECT jsonb_agg(jsonb_build_object('day', day, 'count', count) ORDER BY day) FROM daily), '[]'::jsonb),
    'top_rooms', COALESCE((SELECT jsonb_agg(jsonb_build_object('id', id, 'title', title, 'popularity', popularity, 'tag', tag, 'owner_name', owner_name)) FROM top_rooms), '[]'::jsonb),
    'totals', jsonb_build_object(
      'users', (SELECT COUNT(*) FROM public.profiles),
      'rooms_active', (SELECT COUNT(*) FROM public.rooms WHERE is_active = true),
      'vips', (SELECT COUNT(*) FROM public.user_roles WHERE role = 'vip')
    )
  ) INTO result;

  RETURN result;
END $$;

REVOKE EXECUTE ON FUNCTION public.get_admin_stats() FROM anon;
GRANT EXECUTE ON FUNCTION public.get_admin_stats() TO authenticated;
