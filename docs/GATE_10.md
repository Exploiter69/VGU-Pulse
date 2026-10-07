# VGU-Pulse Phase 10 — Student Utility Layer

Status: implementation complete; production deployment pending local validation.

## Delivered

Phase 10 adds a dedicated **Tools** view for common student calculations:

- SGPA — credit-weighted subject grade points
- CGPA — credit-weighted semester SGPA
- Attendance — current percentage and classes needed to reach a target
- Marks — raw obtained/max percentage across components

## Boundaries

- Browser-only calculations.
- No marks, attendance, grades, or calculator inputs are stored in D1.
- No ERP/Digicampus credentials or private data are accessed.
- Marks calculator does not assume VGU-specific internal/external weighting.
- Attendance calculator is mathematical guidance, not an official VGU attendance rule.
- Existing official Student Toolkit links remain unchanged.
- No new paid service, API, AI provider, database table, or infrastructure.

## Validation

From the local checkout:

```bash
git pull --ff-only origin main
npm test
npm run check
npx wrangler deploy
```

After deployment, open the Pulse URL and verify:

1. **Tools** appears in navigation.
2. SGPA calculates correctly for credit/grade-point rows.
3. CGPA calculates correctly for semester SGPA/credit rows.
4. Attendance handles both above-target and below-target cases.
5. Marks percentage rejects invalid obtained > maximum input.
6. Existing Home, Ask, Academics, Community, People, Campus and Pulse views remain usable.

## Cost

$0 / ₹0 additional infrastructure.
