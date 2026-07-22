-- Demo assignment submissions for staff UI testing (skipped if any submissions already exist)

do $$
declare
  learner_ada uuid := '00000000-0000-4000-8000-000000000001';
  learner_chidi uuid := '00000000-0000-4000-8000-000000000002';
  learner_fatima uuid := '00000000-0000-4000-8000-000000000003';
  assignment_id text := 'worksheet-01-fashion-design-tailoring';
  sample_answers jsonb := '{
    "master_name": "Alhaji Musa Garment Works",
    "q1_definition": "Fashion design and tailoring is creating clothes that fit the customer well and look professional. It matters because happy customers bring repeat business.",
    "q2a_skills_checked": ["0", "1", "2"],
    "q2b_skill_practice": "For measurements, I use a tape measure on the bust, waist, and hips, then write each number in my order book before cutting.",
    "q3_scenario": "Taking measurements went wrong — I did not allow enough ease at the waist. Next time I will remeasure and add 2cm ease for fitted dresses.",
    "q4_safety": "Pattern making failed because I cut without truing the side seams. I should pin the pattern and check alignment before cutting fabric.",
    "q4_confidence": "2",
    "q5a_commitment": "Finishing and pressing — I will press every seam before handing over to the customer.",
    "q5b_commitment": "By Friday I will complete one blouse with clean finishing and show my master before the customer collects it."
  }'::jsonb;
begin
  if exists (select 1 from public.lms_assignment_submissions limit 1) then
    return;
  end if;

  if not exists (select 1 from public.lms_assignments where id = assignment_id) then
    return;
  end if;

  insert into public.lms_learners (id, phone, name, first_name, last_name, role)
  values
    (learner_ada, '+2348012345678', 'Ada Okafor', 'Ada', 'Okafor', 'learner'),
    (learner_chidi, '+2348023456789', 'Chidi Eze', 'Chidi', 'Eze', 'learner'),
    (learner_fatima, '+2348034567890', 'Fatima Bello', 'Fatima', 'Bello', 'learner')
  on conflict (phone) do nothing;

  select id into learner_ada from public.lms_learners where phone = '+2348012345678';
  select id into learner_chidi from public.lms_learners where phone = '+2348023456789';
  select id into learner_fatima from public.lms_learners where phone = '+2348034567890';

  insert into public.lms_assignment_submissions (assignment_id, learner_id, answers, submitted_at)
  values
    (assignment_id, learner_ada, sample_answers, now() - interval '1 day'),
    (assignment_id, learner_chidi, sample_answers, now() - interval '2 days'),
    (assignment_id, learner_fatima, sample_answers, now() - interval '3 days')
  on conflict (assignment_id, learner_id) do nothing;
end;
$$;
