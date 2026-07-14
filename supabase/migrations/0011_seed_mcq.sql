-- =============================================================================
-- Migration 0011: Seed demo multiple-choice questions + mix into demo template
-- =============================================================================

insert into public.questions
  (id, organization_id, category_id, title, description, question_text,
   question_type, options, correct_option_keys, cefr_level, difficulty, tags, time_limit_seconds)
values
  ('e1000000-0000-0000-0000-000000000001', null, 'c1000000-0000-0000-0000-000000000002',
   'Present Simple Agreement', 'Grammar — subject/verb agreement.',
   'Choose the correct form: "She ____ to work every day."',
   'multiple_choice',
   jsonb_build_array(
     jsonb_build_object('key','a','text','go'),
     jsonb_build_object('key','b','text','goes'),
     jsonb_build_object('key','c','text','going'),
     jsonb_build_object('key','d','text','gone')),
   array['b'], 'A2', 'easy', array['grammar','present-simple'], 45),

  ('e1000000-0000-0000-0000-000000000002', null, 'c1000000-0000-0000-0000-000000000004',
   'Vocabulary — Synonyms', 'Vocabulary — choose the closest meaning.',
   'Which word is closest in meaning to "joyful"?',
   'multiple_choice',
   jsonb_build_array(
     jsonb_build_object('key','a','text','tired'),
     jsonb_build_object('key','b','text','angry'),
     jsonb_build_object('key','c','text','cheerful'),
     jsonb_build_object('key','d','text','bored')),
   array['c'], 'B1', 'medium', array['vocabulary','synonyms'], 45)
on conflict (id) do nothing;

-- Add the two MCQ questions to the demo template (after the speaking questions).
insert into public.exam_questions (template_id, question_id, position) values
  ('22222222-2222-2222-2222-222222222222', 'e1000000-0000-0000-0000-000000000001', 6),
  ('22222222-2222-2222-2222-222222222222', 'e1000000-0000-0000-0000-000000000002', 7)
on conflict (template_id, question_id) do nothing;
