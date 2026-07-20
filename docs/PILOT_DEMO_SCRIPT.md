# Controlled pilot demo script (one practice)

Realistic walkthrough for owner + staff after BAAs and admin readiness. Use **demo mode** for Google review AI approval steps if live Google is not configured.

**Prep:** Owner account, MFA enrolled, PHI readiness mostly green, vendors page reviewed. Prefer demo org for dry rehearsal; use pilot org only when controlled pilot is intentionally on.

---

1. **Owner login** — email/password + MFA challenge if required.
2. **PHI readiness** — `/provider/settings/phi-readiness` — review security, MFA, RLS, audit, backup, monitoring, incident, vendors.
3. **Vendor readiness** — `/provider/settings/vendors` — BAAs marked; secrets never fully shown.
4. **Staff onboarding** — `/provider/settings/staff-onboarding` — invite accepted, MFA, role, PHI notice.
5. **Pilot launch** — `/provider/settings/pilot-launch` — status Not ready → Controlled pilot ready; enable controlled pilot only when blockers clear. Banner: **Controlled Live Pilot**.
6. **Patient search** — `/provider/patients` — find a test patient.
7. **Create patient** — demographics only; set communication consent on chart (SMS/email explicit; portal default on).
8. **Schedule appointment** — pick provider + location + time.
9. **Check-in** — move appointment to checked-in / arrive workflow.
10. **Start encounter** — open visit / encounter from appointment.
11. **SOAP note draft** — create clinical note; leave draft.
12. **Sign note** — provider signs (nothing auto-signs).
13. **Create Rx** — glasses or CL draft.
14. **Sign Rx** — provider sign-off.
15. **Upload/review imaging** — upload study; review AI assist if present (provider review required).
16. **Patient portal message** — send portal thread (works even if SMS/email off).
17. **Preview reminder** — create/preview campaign; confirm consent gate blocks SMS without opt-in.
18. **Optical order** — create order draft for glasses/CL.
19. **Invoice draft** — create patient invoice draft (no fake “paid”).
20. **Google review AI draft** — in **demo mode**, generate/approve draft response; do not claim live publish without Google Business configured.
21. **Audit log review** — confirm PHI/pilot/import/MFA events present without secrets.
22. **Patient portal login** — patient user views messages / upcoming visit.

## Pass criteria

- Demo rehearsal works without live PHI.
- Live PHI remains fail-closed until readiness + `livePhiEnabled` + controlled pilot.
- Controlled pilot banner visible and restrictions understood.
- No fake vendor success toasts for unconfigured integrations.
