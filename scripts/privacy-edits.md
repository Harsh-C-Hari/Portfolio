# Privacy Redactions & Screenshot Audits

Audit and redaction log for public case study screenshots in Personal Cloud Gaming Orchestrator (PCGO) and Productivity Dashboard.
Generated and applied via `scripts/images.mjs`.

## Summary Table

| Source File | Destination | Region (left, top, width, height) | Method | Original Content | Rationale |
|---|---|---|---|---|---|
| `reference/pcgo-screenshots/host-monitor.png` | `img/work/pcgo/host-monitor-*.webp` | `(810, 550, 155, 25)` | Heavy Gaussian Blur (`sigma: 14`) | Windows Hostname `LAPTOP-RDCFAJT3` | Protects local machine identity and device naming convention. |
| `reference/pcgo-screenshots/user-management.png` | `img/work/pcgo/user-management-*.webp` | Row 2: `(105, 692, 140, 58)`<br>Row 3: `(105, 766, 150, 58)`<br>Row 4: `(105, 838, 140, 58)` | Heavy Gaussian Blur (`sigma: 14`) | User directory avatars & usernames for `tony`, `nishant`, and `harsh` | Protects personal identities, team members' accounts, and usernames. `admin` row preserved as generic. |
| `reference/pcgo-screenshots/sunshine.png` | `img/work/pcgo/sunshine-*.webp` | `(190, 766, 190, 44)` | Heavy Gaussian Blur (`sigma: 14`) | Paired Device UUID `18304B97-6D2E-5C2A-271C-AEBCFFA4CFE7` | Prevents disclosure of hardware identifier and client pairing keys. |
| `reference/dashboard-screenshots/ai-workspace.png` | `img/work/productivity-dashboard/ai-workspace-*.webp` | Card 1: `(360, 794, 175, 20)`<br>Card 2: `(360, 870, 175, 20)` | Solid Card Match Cover (`fill: #0c0c0e`) | Personal emails `chn25csd058@gmail.com` and `harshchri808@gmail.com` | Prevents disclosure of personal email addresses and academic IDs in recent conversation cards. |
| `reference/dashboard-screenshots/collaboration.png` | `img/work/productivity-dashboard/collaboration-*.webp` | `(385, 745, 135, 26)` | Solid Card Match Cover (`fill: #0f0f11`) | Team member email `test@gmail.com` | Prevents disclosure of personal/test email addresses in team member list. |

## Verification Gates

1. Text search verification:
   - `grep -rI "LAPTOP-" work/ index.html src/` returns 0 matches.
   - `grep -rI "chn25csd058" work/ index.html src/` returns 0 matches.
   - `grep -rI "harshchri808" work/ index.html src/` returns 0 matches.
   - `grep -rI "18304B97" work/ index.html src/` returns 0 matches.
2. Responsive image outputs:
   - All 11 PCGO screenshots generated as `-1600.webp` and `-800.webp`.
   - All 6 Dashboard screenshots generated as `-1600.webp` and `-800.webp`.
   - Social Open Graph cards generated at `1200x630` (`og.jpg` for each case study).
