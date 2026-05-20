
-- Admin can delete any room
CREATE POLICY "Admins can delete any room"
ON public.rooms FOR DELETE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- Admin can update any room
CREATE POLICY "Admins can update any room"
ON public.rooms FOR UPDATE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- Admin can view all user roles (for admin dashboard)
CREATE POLICY "Admins can view all roles"
ON public.user_roles FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));
