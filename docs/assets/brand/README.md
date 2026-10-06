# Sign-in provider branding

Square TRMNL Games logos on a gold tile (D59): a cream desk display with a night-ink d-pad and two buttons, padded so circular crops stay clear of it. Regenerate with `pnpm tsx tools/art/brand.ts`; the art lives in `tools/art/platformArt.ts` and is coloured by `tools/art/colour.ts`, shared with the site's `public/` icons. Desk Crawler keeps its Warrior icon (`tools/art/iconArt.ts`) for the [marketplace icon](../plugin-icon.png) and `public/games/desk-crawler/`.

| Where | File | Notes |
| --- | --- | --- |
| Clerk → Customization → Branding, application logo | [`logo-400.png`](logo-400.png) | Also used in Clerk's emails. Use `public/favicon.ico` where Clerk asks for a favicon. |
| Google Cloud → OAuth consent screen (Branding), app logo | [`logo-120.png`](logo-120.png) | Uploading a logo means Google has to verify the brand before the consent screen shows it in production. |
| GitHub → Developer settings → OAuth App, application logo | [`logo-200.png`](logo-200.png) | Badge background colour: `#F2C14E`. |
| Anywhere asking for a large square | [`logo-1000.png`](logo-1000.png) | |

## Form values

| Field | Value |
| --- | --- |
| App name | TRMNL Games |
| Short description | Games that play themselves on your TRMNL e-ink display. |
| Homepage | https://trmnlgames.com |
| Privacy policy | https://trmnlgames.com/privacy |
| Terms of service | https://trmnlgames.com/terms |
| Support page | https://trmnlgames.com/support |
| Support/developer email | barry@barrymichaeldoyle.com (D36) |
| Authorized domain (Google) | trmnlgames.com |
| OAuth callback / redirect URI | `https://clerk.trmnlgames.com/v1/oauth_callback` (shown in the Clerk dashboard's Google and GitHub connection settings for the production instance) |
