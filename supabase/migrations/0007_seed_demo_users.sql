-- =============================================================================
-- Migration 0007: Demo auth users (for local/demo evaluation only)
-- =============================================================================
-- Creates three confirmed email/password users and wires their profiles to the
-- demo organization. Passwords: "Password123!". In a real deployment you would
-- instead invite users and let them set their own passwords.
--
--   superadmin@demo.test  -> super_admin (no organization)
--   admin@demo.test       -> org_admin   (Demo Academy)
--   student@demo.test     -> student     (Demo Academy)
-- =============================================================================

do $$
declare
  v_super   uuid := 'a0000000-0000-0000-0000-000000000001';
  v_admin   uuid := 'a0000000-0000-0000-0000-000000000002';
  v_student uuid := 'a0000000-0000-0000-0000-000000000003';
  v_org     uuid := '11111111-1111-1111-1111-111111111111';
  v_exam    uuid := '33333333-3333-3333-3333-333333333333';
  rec record;
begin
  for rec in
    select * from (values
      (v_super,   'superadmin@demo.test', 'Super Admin'),
      (v_admin,   'admin@demo.test',      'Alex Organization Admin'),
      (v_student, 'student@demo.test',    'Sam Student')
    ) as t(id, email, full_name)
  loop
    insert into auth.users (
      instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
      created_at, updated_at, raw_app_meta_data, raw_user_meta_data,
      confirmation_token, recovery_token, email_change_token_new, email_change,
      email_change_token_current, reauthentication_token, phone_change, phone_change_token,
      is_super_admin, is_sso_user, is_anonymous
    ) values (
      '00000000-0000-0000-0000-000000000000', rec.id, 'authenticated', 'authenticated',
      rec.email, extensions.crypt('Password123!', extensions.gen_salt('bf')), now(),
      now(), now(), '{"provider":"email","providers":["email"]}'::jsonb,
      jsonb_build_object('full_name', rec.full_name),
      '', '', '', '', '', '', '', '',
      false, false, false
    )
    on conflict (id) do nothing;

    insert into auth.identities (
      id, user_id, provider_id, provider, identity_data, last_sign_in_at, created_at, updated_at
    ) values (
      gen_random_uuid(), rec.id, rec.email, 'email',
      jsonb_build_object('sub', rec.id::text, 'email', rec.email, 'email_verified', true),
      now(), now(), now()
    )
    on conflict (provider_id, provider) do nothing;
  end loop;

  -- Assign roles / organization (trigger created the profiles as plain students).
  update public.profiles set role = 'super_admin', organization_id = null,     full_name = 'Super Admin'             where id = v_super;
  update public.profiles set role = 'org_admin',   organization_id = v_org,      full_name = 'Alex Organization Admin' where id = v_admin;
  update public.profiles set role = 'student',      organization_id = v_org,      full_name = 'Sam Student'             where id = v_student;

  -- Assign the demo exam to the demo student.
  insert into public.exam_assignments (exam_id, student_id, organization_id, status, assigned_by)
  values (v_exam, v_student, v_org, 'assigned', v_admin)
  on conflict (exam_id, student_id) do nothing;
end$$;
