
-- Waiting list (queue) for room stage seats
CREATE TABLE public.room_waitlist (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id uuid NOT NULL REFERENCES public.rooms(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (room_id, user_id)
);

CREATE INDEX idx_room_waitlist_room ON public.room_waitlist(room_id, created_at);

ALTER TABLE public.room_waitlist ENABLE ROW LEVEL SECURITY;

-- Anyone authenticated can view waitlist entries (shown to the whole room)
CREATE POLICY "Waitlist viewable by auth"
  ON public.room_waitlist FOR SELECT
  TO authenticated
  USING (true);

-- Users can only enqueue themselves
CREATE POLICY "Users join waitlist as self"
  ON public.room_waitlist FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Users can leave the waitlist themselves; room owners and admins can remove anyone
CREATE POLICY "Self or owner or admin can leave waitlist"
  ON public.room_waitlist FOR DELETE
  TO authenticated
  USING (
    auth.uid() = user_id
    OR EXISTS (SELECT 1 FROM public.rooms r WHERE r.id = room_waitlist.room_id AND r.owner_id = auth.uid())
    OR public.has_role(auth.uid(), 'admin'::app_role)
  );

-- Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.room_waitlist;
