-- Gate 3 academic-data normalization. Never modify prior migrations.
-- Map common legacy spellings to the controlled labels; anything still outside the
-- maintained sets remains "Other" so existing student records are never rejected.
UPDATE student_profiles
SET program=CASE lower(trim(program))
  WHEN 'btech' THEN 'B.Tech'
  WHEN 'b.tech cse' THEN 'B.Tech'
  WHEN 'b.tech' THEN 'B.Tech'
  WHEN 'bca' THEN 'BCA'
  WHEN 'bba' THEN 'BBA'
  WHEN 'b.com' THEN 'B.Com'
  WHEN 'bcom' THEN 'B.Com'
  WHEN 'b.arch' THEN 'B.Arch'
  WHEN 'bdes' THEN 'B.Des'
  WHEN 'b.des' THEN 'B.Des'
  WHEN 'bpharm' THEN 'B.Pharm'
  WHEN 'b.pharm' THEN 'B.Pharm'
  WHEN 'bsc' THEN 'B.Sc'
  WHEN 'b.sc' THEN 'B.Sc'
  WHEN 'bpt' THEN 'BPT'
  WHEN 'ba/bjmc' THEN 'BA/BJMC'
  WHEN 'mba' THEN 'MBA'
  WHEN 'mtech' THEN 'M.Tech'
  WHEN 'm.tech' THEN 'M.Tech'
  WHEN 'mca' THEN 'MCA'
  WHEN 'msc' THEN 'M.Sc'
  WHEN 'm.sc' THEN 'M.Sc'
  WHEN 'phd' THEN 'Ph.D.'
  WHEN 'ph.d.' THEN 'Ph.D.'
  ELSE 'Other'
END
WHERE lower(trim(program)) NOT IN (
  'b.tech','bca','bba','b.com','b.arch','b.des','b.pharm','b.sc','bpt',
  'ba/bjmc','llb / integrated law','mba','m.tech','mca','m.sc','ph.d.','other'
);

UPDATE student_profiles
SET branch=CASE lower(trim(branch))
  WHEN 'cse' THEN 'CSE'
  WHEN 'computer science and engineering' THEN 'Computer Science & Engineering'
  WHEN 'computer science & engineering' THEN 'Computer Science & Engineering'
  WHEN 'cse ai' THEN 'CSE — Artificial Intelligence'
  WHEN 'cse-ai' THEN 'CSE — Artificial Intelligence'
  WHEN 'cse aiml' THEN 'CSE — Artificial Intelligence & Machine Learning'
  WHEN 'cse-aiml' THEN 'CSE — Artificial Intelligence & Machine Learning'
  WHEN 'cse cloud' THEN 'CSE — Cloud Computing'
  WHEN 'cse-cloud' THEN 'CSE — Cloud Computing'
  WHEN 'cse iot' THEN 'CSE — IoT & Cyber Security'
  WHEN 'cse iot cyber security' THEN 'CSE — IoT & Cyber Security'
  WHEN 'artificial intelligence and data science' THEN 'Artificial Intelligence & Data Science'
  WHEN 'artificial intelligence & data science' THEN 'Artificial Intelligence & Data Science'
  WHEN 'computer science and technology' THEN 'Computer Science & Technology'
  WHEN 'computer science & technology' THEN 'Computer Science & Technology'
  WHEN 'software engineering' THEN 'Software Engineering'
  WHEN 'mechanical' THEN 'Mechanical Engineering'
  WHEN 'mechanical engineering' THEN 'Mechanical Engineering'
  WHEN 'civil' THEN 'Civil Engineering'
  WHEN 'civil engineering' THEN 'Civil Engineering'
  WHEN 'electrical' THEN 'Electrical Engineering'
  WHEN 'electrical engineering' THEN 'Electrical Engineering'
  ELSE 'Other'
END
WHERE lower(trim(branch)) NOT IN (
  'computer science & engineering','cse','cse — artificial intelligence',
  'cse — artificial intelligence & machine learning','cse — cloud computing',
  'cse — iot & cyber security','artificial intelligence & data science',
  'computer science & technology','software engineering','mechanical engineering',
  'civil engineering','electrical engineering','other'
);
