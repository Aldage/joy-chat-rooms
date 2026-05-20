-- dice game logs
CREATE TABLE public.dice_games (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  room_id uuid,
  bet_amount integer NOT NULL CHECK (bet_amount > 0),
  dice_result integer NOT NULL CHECK (dice_result BETWEEN 1 AND 6),
  is_win boolean NOT NULL,
  reward_amount integer NOT NULL DEFAULT 0,
  played_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.dice_games ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users view own dice games" ON public.dice_games FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users insert own dice games" ON public.dice_games FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE INDEX idx_dice_games_user ON public.dice_games(user_id, played_at DESC);

-- PK battle records
CREATE TYPE public.pk_status AS ENUM ('active','completed');
CREATE TABLE public.pk_battles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id uuid NOT NULL,
  blue_team_score integer NOT NULL DEFAULT 0,
  red_team_score integer NOT NULL DEFAULT 0,
  status public.pk_status NOT NULL DEFAULT 'active',
  started_at timestamptz NOT NULL DEFAULT now(),
  ended_at timestamptz
);
ALTER TABLE public.pk_battles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "PK battles viewable by authenticated" ON public.pk_battles FOR SELECT TO authenticated USING (true);
CREATE POLICY "Room owner can create PK battles" ON public.pk_battles FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM public.rooms r WHERE r.id = room_id AND r.owner_id = auth.uid()));
CREATE POLICY "Room owner can update PK battles" ON public.pk_battles FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM public.rooms r WHERE r.id = room_id AND r.owner_id = auth.uid()));
CREATE INDEX idx_pk_battles_room ON public.pk_battles(room_id, started_at DESC);

-- coin transactions audit log
CREATE TYPE public.coin_tx_type AS ENUM ('purchase','gift_send','gift_receive','dice_bet','dice_win','store_buy');
CREATE TABLE public.coin_transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  amount integer NOT NULL,
  type public.coin_tx_type NOT NULL,
  description text,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.coin_transactions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users view own coin tx" ON public.coin_transactions FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users insert own coin tx" ON public.coin_transactions FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE INDEX idx_coin_tx_user ON public.coin_transactions(user_id, created_at DESC);