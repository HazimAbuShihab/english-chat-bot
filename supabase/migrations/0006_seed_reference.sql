-- =============================================================================
-- Migration 0006: Reference & demo seed data (no auth users)
-- =============================================================================

-- Roles ----------------------------------------------------------------------
insert into public.roles (key, name, description, rank) values
  ('super_admin', 'Super Admin',        'Platform operator with full access to every organization.', 100),
  ('org_admin',   'Organization Admin', 'Manages questions, exams, students and results for one organization.', 50),
  ('student',     'Student',            'Takes assigned speaking exams and views their own results.', 10)
on conflict (key) do update set name = excluded.name, description = excluded.description, rank = excluded.rank;

-- Global categories ----------------------------------------------------------
insert into public.categories (id, organization_id, name, slug, description, color) values
  ('c1000000-0000-0000-0000-000000000001', null, 'Introductions',   'introductions', 'Self-introduction and personal background.', '#6366f1'),
  ('c1000000-0000-0000-0000-000000000002', null, 'Daily Life',      'daily-life',    'Everyday routines, hobbies and experiences.', '#0ea5e9'),
  ('c1000000-0000-0000-0000-000000000003', null, 'Work & Career',   'work-career',   'Professional experience and workplace topics.', '#10b981'),
  ('c1000000-0000-0000-0000-000000000004', null, 'Opinions',        'opinions',      'Expressing and justifying opinions.', '#f59e0b'),
  ('c1000000-0000-0000-0000-000000000005', null, 'Travel & Culture','travel-culture','Travel, culture and society.', '#ec4899')
on conflict (id) do nothing;

-- Global question bank -------------------------------------------------------
insert into public.questions
  (id, organization_id, category_id, title, description, question_text, cefr_level, difficulty, tags, prep_time_seconds, time_limit_seconds)
values
  ('d1000000-0000-0000-0000-000000000001', null, 'c1000000-0000-0000-0000-000000000001',
   'Introduce Yourself', 'Warm-up self introduction.',
   'Please introduce yourself. Tell me your name, where you are from, and what you do.',
   'A2', 'easy', array['introduction','warmup'], 20, 90),

  ('d1000000-0000-0000-0000-000000000002', null, 'c1000000-0000-0000-0000-000000000002',
   'Describe Your Daily Routine', 'Talk about a typical day.',
   'Describe a typical day in your life. What do you usually do from morning to evening?',
   'A2', 'easy', array['routine','daily-life'], 30, 120),

  ('d1000000-0000-0000-0000-000000000003', null, 'c1000000-0000-0000-0000-000000000002',
   'A Memorable Experience', 'Narrate a past experience.',
   'Tell me about a memorable experience you had recently. What happened and why was it memorable?',
   'B1', 'medium', array['narrative','past'], 40, 120),

  ('d1000000-0000-0000-0000-000000000004', null, 'c1000000-0000-0000-0000-000000000003',
   'Your Ideal Job', 'Discuss career aspirations.',
   'Describe your ideal job. What would you do, and why does it appeal to you?',
   'B1', 'medium', array['work','career'], 40, 120),

  ('d1000000-0000-0000-0000-000000000005', null, 'c1000000-0000-0000-0000-000000000004',
   'Technology in Education', 'Give and justify an opinion.',
   'Some people believe technology has made education better, while others disagree. What is your opinion, and why?',
   'B2', 'medium', array['opinion','technology','education'], 45, 150),

  ('d1000000-0000-0000-0000-000000000006', null, 'c1000000-0000-0000-0000-000000000004',
   'Remote Work Debate', 'Argue a position.',
   'Do you think remote work is better than working in an office? Explain your reasoning with examples.',
   'B2', 'hard', array['opinion','work'], 45, 150),

  ('d1000000-0000-0000-0000-000000000007', null, 'c1000000-0000-0000-0000-000000000005',
   'A Place Worth Visiting', 'Describe and recommend.',
   'Describe a place in your country that you would recommend to a visitor. What makes it special?',
   'B1', 'medium', array['travel','culture'], 40, 120),

  ('d1000000-0000-0000-0000-000000000008', null, 'c1000000-0000-0000-0000-000000000004',
   'Global Challenges', 'Advanced discursive prompt.',
   'What do you consider the most pressing challenge facing the world today, and how should societies respond to it?',
   'C1', 'hard', array['opinion','society','advanced'], 60, 180)
on conflict (id) do nothing;

-- Demo organization ----------------------------------------------------------
insert into public.organizations (id, name, slug, contact_email, plan, max_students)
values ('11111111-1111-1111-1111-111111111111', 'Demo Academy', 'demo-academy', 'admin@demo.test', 'pro', 500)
on conflict (id) do nothing;

-- Demo exam template ---------------------------------------------------------
insert into public.exam_templates
  (id, organization_id, title, description, instructions, randomize_questions, passing_score,
   total_time_limit_seconds, retake_policy, max_attempts, show_results_to_student, status)
values
  ('22222222-2222-2222-2222-222222222222', '11111111-1111-1111-1111-111111111111',
   'General English Speaking Assessment',
   'A five-part speaking assessment covering introductions, narration and opinion.',
   'You will be asked five questions. For each, you will have preparation time followed by recording time. Speak clearly and answer as fully as you can. You cannot go back to a previous question once you move on.',
   false, 60, 900, 'limited', 2, true, 'published')
on conflict (id) do nothing;

-- Template questions (ordered) ----------------------------------------------
insert into public.exam_questions (template_id, question_id, position) values
  ('22222222-2222-2222-2222-222222222222', 'd1000000-0000-0000-0000-000000000001', 1),
  ('22222222-2222-2222-2222-222222222222', 'd1000000-0000-0000-0000-000000000002', 2),
  ('22222222-2222-2222-2222-222222222222', 'd1000000-0000-0000-0000-000000000003', 3),
  ('22222222-2222-2222-2222-222222222222', 'd1000000-0000-0000-0000-000000000004', 4),
  ('22222222-2222-2222-2222-222222222222', 'd1000000-0000-0000-0000-000000000005', 5)
on conflict (template_id, question_id) do nothing;

-- Demo published exam --------------------------------------------------------
insert into public.exams
  (id, organization_id, template_id, title, description, join_code, status,
   available_until, settings, passing_score, max_attempts, show_results_to_student)
values
  ('33333333-3333-3333-3333-333333333333', '11111111-1111-1111-1111-111111111111',
   '22222222-2222-2222-2222-222222222222',
   'General English Speaking Assessment', 'Placement speaking exam for new students.',
   'DEMO2026', 'active',
   now() + interval '30 days',   -- exams should not stay open forever
   jsonb_build_object('randomize_questions', false, 'question_count', 0, 'total_time_limit_seconds', 900),
   60, 2, true)
on conflict (id) do nothing;
