# Installation walkthrough — 2026-10-04

Production companion and Convex; plugin 564, status development. Fresh plugin setting 495833 was created for Barry's existing authenticated account and hero, then removed. Existing setting 495747 remained active; no hero reset or second starter kit occurred.

[Local MP4 walkthrough](install-walkthrough.mp4) is a **silent slideshow of actual browser screenshots**, not a continuous recording. It demonstrates new installation, account connection, Save, management, successful render timeline and cleanup. The account was already signed in; it does not demonstrate new Clerk signup. TRMNL's static featured image shown on the installation form is an older sample, not the latest delivered screen.

| Frame | Observed step |
| --- | --- |
| [01-connect.png](01-connect.png) | Fresh installation's Connect link |
| [02-authorize.png](02-authorize.png) | Companion authorizes the signed-in owner's existing hero |
| [03-linked.png](03-linked.png) | Account linked, Save enabled |
| [04-saved.png](04-saved.png) | Saved setting, Configure link and 15-minute interval |
| [05-manage.png](05-manage.png) | Verified management landing for the new installation |
| [06-render.png](06-render.png) | Timeline: successful render at 13:13:13 SAST, 941 ms, 22.6 KB |
| [07-removed.png](07-removed.png) | Only original installation remains after uninstall |

Production read-only inspection confirmed `495833: uninstalled` and `495747: active`, both originally confirmed by success callback. A render is not hardware delivery: the demo was removed before its scheduled device slot. Earlier original-installation delivery is documented in [layouts](../trmnl-layouts.md).

The MP4 needs approved external hosting before the [review email](../../review-email.md) can include a reviewer-accessible URL. A continuous first-account recording and an updated featured screenshot remain final submission improvements. Do not send owner credentials or browser-session state to reviewers.
