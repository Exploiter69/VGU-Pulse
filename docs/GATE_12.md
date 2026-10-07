# Gate 12 — Community Quality

Status: implementation complete; production deployment pending local validation.

## Delivered

- Reddit-style upvote/downvote on student posts.
- Reddit-style upvote/downvote on student replies.
- One vote per authenticated Telegram user per post/reply.
- Clicking the same vote again removes it.
- Switching direction changes the existing vote.
- Vote score = upvotes - downvotes.
- Current user's vote is returned as `viewer_vote`.
- Most useful feed sorting by vote score.
- Deterministic related-post discovery using bounded token overlap.
- Related posts shown alongside community discussions to reduce duplicate questions.
- Existing newest, most discussed and unanswered sorting retained.
- Existing report threshold remains three reports before hiding.
- Existing owner delete, authenticated reporting and student-reported trust labels retained.

## Trust and privacy

- Community content remains student-reported, never official VGU information.
- Voting requires a valid Telegram Mini App session.
- Telegram IDs are never exposed to the frontend.
- Vote tables store only the existing Telegram user identity internally and enforce one vote per user.
- No direct messaging was added.
- Related-post matching is deterministic and local to existing Pulse data; no LLM or external AI is used.

## Infrastructure

- One D1 migration: `0007_community_votes.sql`.
- Uses existing VGU-Pulse Worker and D1 database.
- No paid services.
- No external API.
- No Redis, Kafka, Celery, Kubernetes, or second workflow.
- Cost: $0 / ₹0.

## Validation

Run:

```bash
cd ~/VGU-Pulse
git pull --ff-only origin main
npx wrangler d1 migrations apply vgu-pulse --remote
npm test
npm run check
npx wrangler deploy
```

## Manual verification

1. Open Community.
2. Confirm **Most useful** appears in sorting.
3. Confirm every post has upvote/downvote controls and score.
4. Vote up, vote down, switch direction, and click the active direction again to remove the vote.
5. Confirm unauthenticated/public browsing can read community content but cannot vote.
6. Reply to a post and verify replies have their own voting controls.
7. Confirm related student posts appear when discussions share meaningful terms.
8. Confirm reporting and owner deletion still work.
9. Confirm official VGU information remains clearly separate from student-reported content.

## Phase 12 boundary

This phase does not attempt to moderate or rank content using an LLM. Deterministic scoring, reports, replies and votes are the community signal. Private ERP/Digicampus information remains outside Pulse's access boundary.
