# Privacy Redactions & Screenshot Audits

Audit and redaction log for public case study screenshots in Personal Cloud Gaming Orchestrator (PCGO) and Productivity Dashboard.
Generated and applied via `scripts/images.mjs`.

## Summary Table

| Source File | Destination | Region (left, top, width, height) | Method | Original Content | Rationale |
|---|---|---|---|---|---|
| `reference/pcgo-screenshots/host-monitor.png` | `img/work/pcgo/host-monitor-*.webp` | `(810, 550, 155, 25)` | Heavy Gaussian Blur (`sigma: 14`) | Windows Hostname | Protects local machine identity and device naming convention. |
| `reference/pcgo-screenshots/user-management.png` | `img/work/pcgo/user-management-*.webp` | Row 2: `(105, 692, 140, 58)`<br>Row 3: `(105, 766, 150, 58)`<br>Row 4: `(105, 838, 140, 58)` | Heavy Gaussian Blur (`sigma: 14`) | User directory avatars & other users' usernames | Protects personal identities, team members' accounts, and usernames. `admin` row preserved as generic. |
| `reference/pcgo-screenshots/sunshine.png` | `img/work/pcgo/sunshine-*.webp` | `(190, 766, 190, 44)` | Heavy Gaussian Blur (`sigma: 14`) | Paired Device UUID | Prevents disclosure of hardware identifier and client pairing keys. |
| `reference/dashboard-screenshots/ai-workspace.png` | `img/work/productivity-dashboard/ai-workspace-*.webp` | Card 1: `(360, 794, 175, 20)`<br>Card 2: `(360, 870, 175, 20)` | Solid Card Match Cover (`fill: #0c0c0e`) | Two personal email addresses | Prevents disclosure of personal email addresses and academic IDs in recent conversation cards. |
| `reference/dashboard-screenshots/collaboration.png` | `img/work/productivity-dashboard/collaboration-*.webp` | `(385, 745, 135, 26)` | Solid Card Match Cover (`fill: #0f0f11`) | Team member email address | Prevents disclosure of personal/test email addresses in team member list. |

## Verification Gates

1. Text search verification:
   - Automated leak scan enforced via `scripts/check-leaks.mjs`.
2. Responsive image outputs:
   - All 11 PCGO screenshots generated as `-1600.webp` and `-800.webp`.
   - All 6 Dashboard screenshots generated as `-1600.webp` and `-800.webp`.
   - Social Open Graph cards generated at `1200x630` (`og.jpg` for each case study).
