-- =============================================================================
-- Migration 0005: Storage buckets & policies
-- =============================================================================
-- answer-audio   : private. Student recordings.
--                  path convention: {organization_id}/{student_id}/{session_id}/{file}
-- question-audio  : private. Admin-uploaded question prompts.
--                  path convention: {organization_id | 'global'}/{question_id}/{file}
-- All access to storage.objects is text-based on the folder segments to avoid
-- unsafe uuid casts of attacker-controlled paths.
-- =============================================================================

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values
  ('answer-audio', 'answer-audio', false, 52428800,
   array['audio/webm','audio/ogg','audio/mpeg','audio/mp3','audio/wav','audio/x-wav','audio/mp4','audio/x-m4a','audio/aac']),
  ('question-audio', 'question-audio', false, 52428800,
   array['audio/webm','audio/ogg','audio/mpeg','audio/mp3','audio/wav','audio/x-wav','audio/mp4','audio/x-m4a','audio/aac'])
on conflict (id) do nothing;

-- ---------------------------------------------------------------------------
-- answer-audio policies
-- ---------------------------------------------------------------------------
drop policy if exists answer_audio_insert on storage.objects;
create policy answer_audio_insert on storage.objects for insert to authenticated
  with check (
    bucket_id = 'answer-audio'
    and (storage.foldername(name))[1] = public.current_org_id()::text
    and (storage.foldername(name))[2] = auth.uid()::text
  );

drop policy if exists answer_audio_select on storage.objects;
create policy answer_audio_select on storage.objects for select to authenticated
  using (
    bucket_id = 'answer-audio'
    and (
      owner = auth.uid()
      or public.is_super_admin()
      or (public.is_org_admin() and (storage.foldername(name))[1] = public.current_org_id()::text)
    )
  );

drop policy if exists answer_audio_update on storage.objects;
create policy answer_audio_update on storage.objects for update to authenticated
  using (
    bucket_id = 'answer-audio'
    and (owner = auth.uid()
         or public.is_super_admin()
         or (public.is_org_admin() and (storage.foldername(name))[1] = public.current_org_id()::text))
  );

drop policy if exists answer_audio_delete on storage.objects;
create policy answer_audio_delete on storage.objects for delete to authenticated
  using (
    bucket_id = 'answer-audio'
    and (owner = auth.uid()
         or public.is_super_admin()
         or (public.is_org_admin() and (storage.foldername(name))[1] = public.current_org_id()::text))
  );

-- ---------------------------------------------------------------------------
-- question-audio policies
-- ---------------------------------------------------------------------------
drop policy if exists question_audio_select on storage.objects;
create policy question_audio_select on storage.objects for select to authenticated
  using (
    bucket_id = 'question-audio'
    and (
      public.is_super_admin()
      or (storage.foldername(name))[1] = 'global'
      or (storage.foldername(name))[1] = public.current_org_id()::text
    )
  );

drop policy if exists question_audio_write on storage.objects;
create policy question_audio_write on storage.objects for insert to authenticated
  with check (
    bucket_id = 'question-audio'
    and (
      public.is_super_admin()
      or (public.is_org_admin() and (storage.foldername(name))[1] = public.current_org_id()::text)
    )
  );

drop policy if exists question_audio_modify on storage.objects;
create policy question_audio_modify on storage.objects for update to authenticated
  using (
    bucket_id = 'question-audio'
    and (public.is_super_admin()
         or (public.is_org_admin() and (storage.foldername(name))[1] = public.current_org_id()::text))
  );

drop policy if exists question_audio_delete on storage.objects;
create policy question_audio_delete on storage.objects for delete to authenticated
  using (
    bucket_id = 'question-audio'
    and (public.is_super_admin()
         or (public.is_org_admin() and (storage.foldername(name))[1] = public.current_org_id()::text))
  );
