# Phase 8 — Community Depth

Status: complete

## Goal

Make Community genuinely useful for student questions, campus information, requests and opportunities while preserving the existing student-reported trust boundary.

## Delivered

- Student posts remain grouped into Questions, Campus information, Opportunities and Requests.
- Community discovery supports Newest, Most discussed and Unanswered first.
- Posts expose their current published reply count.
- Category and sort filters can be combined.
- Replies remain attached to their parent conversation.
- Post and reply owners can delete their own content.
- Reports are authenticated and duplicate reports are ignored.
- Authors cannot report their own posts or replies.
- Three reports hide a post or reply from normal feeds.
- Home continues to surface compact student activity.
- No new database tables, paid services, AI providers, queues or infrastructure were introduced.

## Trust and moderation boundary

All Community content is explicitly student-reported and is never presented as an official VGU announcement.

Reported content is hidden after the existing three-report threshold. Ownership controls use the authenticated Telegram user and do not expose Telegram IDs publicly.

## Validation

Run:

```bash
npm test
npm run check
npx wrangler deploy
```

Acceptance:

1. Community opens with category and sort controls.
2. Newest shows recent posts first.
3. Most discussed prioritizes posts with more published replies.
4. Unanswered first prioritizes posts with zero published replies.
5. Category filtering still works with sorting.
6. Reply counts match published, non-hidden replies.
7. A student can reply to a post.
8. A post/reply owner can delete their own content.
9. A student cannot report their own content.
10. Duplicate reports do not increase report counts.
11. Three reports hide reported content.
12. Home still shows recent student activity.
13. Official VGU information remains separate from student-reported Community content.
