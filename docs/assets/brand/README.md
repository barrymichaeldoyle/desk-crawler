# Sign-in provider branding

Square logos of the Warrior icon on white, padded so circular crops stay clear of the rune circle. Regenerate with `pnpm tsx tools/art/brand.ts`; the art lives in `tools/art/iconArt.ts`, shared with the [marketplace icon](../plugin-icon.png) and the companion's `public/` icons.

| Where | File | Notes |
| --- | --- | --- |
| Clerk → Customization → Branding, application logo | [`logo-400.png`](logo-400.png) | Also used in Clerk's emails. Use `public/favicon.ico` where Clerk asks for a favicon. |
| Google Cloud → OAuth consent screen (Branding), app logo | [`logo-120.png`](logo-120.png) | Uploading a logo means Google has to verify the brand before the consent screen shows it in production. |
| GitHub → Developer settings → OAuth App, application logo | [`logo-200.png`](logo-200.png) | Badge background colour: `#FFFFFF`. |
| Anywhere asking for a large square | [`logo-1000.png`](logo-1000.png) | |

## Form values

| Field | Value |
| --- | --- |
| App name | Desk Crawler |
| Short description | An office RPG that plays itself on your TRMNL e-ink display. |
| Homepage | https://desk-crawler.grandprixpicks.com |
| Privacy policy | https://desk-crawler.grandprixpicks.com/privacy |
| Support page | https://desk-crawler.grandprixpicks.com/support |
| Support/developer email | barry@barrymichaeldoyle.com (D36) |
| Authorized domain (Google) | grandprixpicks.com |
| OAuth callback / redirect URI | Copy it from the Clerk dashboard's Google and GitHub connection settings for the production instance |

There is no terms-of-service page yet. Google's consent screen treats it as optional.
