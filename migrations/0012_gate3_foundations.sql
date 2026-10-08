-- Gate 3 community and discovery foundations. Never modify prior migrations.
CREATE TABLE IF NOT EXISTS communities (
  slug TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  kind TEXT NOT NULL CHECK(kind IN ('club','hostel','batch','branch','topic','campus')),
  description TEXT NOT NULL DEFAULT '',
  rules TEXT NOT NULL DEFAULT '',
  owner_telegram_user_id TEXT,
  official INTEGER NOT NULL DEFAULT 0 CHECK(official IN (0,1)),
  approved INTEGER NOT NULL DEFAULT 0 CHECK(approved IN (0,1)),
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS community_members (
  community_slug TEXT NOT NULL REFERENCES communities(slug) ON DELETE CASCADE,
  telegram_user_id TEXT NOT NULL REFERENCES users(telegram_user_id) ON DELETE CASCADE,
  role TEXT NOT NULL DEFAULT 'member' CHECK(role IN ('member','moderator','owner')),
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY(community_slug,telegram_user_id)
);

CREATE TABLE IF NOT EXISTS community_topics (
  slug TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS vgu_program_options (
  value TEXT PRIMARY KEY,
  label TEXT NOT NULL,
  active INTEGER NOT NULL DEFAULT 1 CHECK(active IN (0,1))
);

CREATE TABLE IF NOT EXISTS vgu_branch_options (
  value TEXT PRIMARY KEY,
  label TEXT NOT NULL,
  active INTEGER NOT NULL DEFAULT 1 CHECK(active IN (0,1))
);

ALTER TABLE student_profiles ADD COLUMN contact_enabled INTEGER NOT NULL DEFAULT 0 CHECK(contact_enabled IN (0,1));

INSERT OR IGNORE INTO communities(slug,name,kind,description,official,approved)
VALUES('campus','Whole Campus','campus','The default VGU-wide student community.',0,1);

INSERT OR IGNORE INTO vgu_program_options(value,label) VALUES
('btech','B.Tech'),('bca','BCA'),('bba','BBA'),('bcom','B.Com'),('barch','B.Arch'),
('bdes','B.Des'),('bpharm','B.Pharm'),('bsc','B.Sc'),('bpt','BPT'),('bajmc','BA/BJMC'),
('llb','LLB / Integrated Law'),('mba','MBA'),('mtech','M.Tech'),('mca','MCA'),
('msc','M.Sc'),('phd','Ph.D.'),('other','Other');

INSERT OR IGNORE INTO vgu_branch_options(value,label) VALUES
('cse','Computer Science & Engineering'),('cse_ai','CSE — Artificial Intelligence'),
('cse_aiml','CSE — Artificial Intelligence & Machine Learning'),
('cse_cloud','CSE — Cloud Computing'),('cse_iot_cyber','CSE — IoT & Cyber Security'),
('ai_ds','Artificial Intelligence & Data Science'),('cst','Computer Science & Technology'),
('software','Software Engineering'),('mechanical','Mechanical Engineering'),
('civil','Civil Engineering'),('electrical','Electrical Engineering'),
('other','Other');

UPDATE student_profiles SET program='Other' WHERE program IS NULL OR trim(program)='';
UPDATE student_profiles SET branch='Other' WHERE branch IS NULL OR trim(branch)='';

UPDATE community_items SET community_slug='campus'
WHERE community_slug IS NULL OR community_slug='' OR NOT EXISTS(
  SELECT 1 FROM communities c WHERE c.slug=community_items.community_slug AND c.approved=1
);

CREATE INDEX IF NOT EXISTS idx_community_items_author_created ON community_items(telegram_user_id,created_at DESC,id DESC);
CREATE INDEX IF NOT EXISTS idx_community_replies_author_created ON community_replies(telegram_user_id,created_at DESC,id DESC);
CREATE INDEX IF NOT EXISTS idx_student_post_votes_user ON student_post_votes(telegram_user_id);
CREATE INDEX IF NOT EXISTS idx_community_votes_user ON community_votes(telegram_user_id);
CREATE INDEX IF NOT EXISTS idx_community_items_cursor ON community_items(status,created_at DESC,id DESC);

CREATE VIRTUAL TABLE IF NOT EXISTS community_items_fts USING fts5(title,body,content='community_items',content_rowid='id');

CREATE TRIGGER IF NOT EXISTS community_items_fts_ai AFTER INSERT ON community_items BEGIN
  INSERT INTO community_items_fts(rowid,title,body) VALUES(new.id,new.title,new.body);
END;
CREATE TRIGGER IF NOT EXISTS community_items_fts_ad AFTER DELETE ON community_items BEGIN
  INSERT INTO community_items_fts(community_items_fts,rowid,title,body) VALUES('delete',old.id,old.title,old.body);
END;
CREATE TRIGGER IF NOT EXISTS community_items_fts_au AFTER UPDATE OF title,body ON community_items BEGIN
  INSERT INTO community_items_fts(community_items_fts,rowid,title,body) VALUES('delete',old.id,old.title,old.body);
  INSERT INTO community_items_fts(rowid,title,body) VALUES(new.id,new.title,new.body);
END;

INSERT OR IGNORE INTO community_items_fts(rowid,title,body)
SELECT id,title,body FROM community_items;
