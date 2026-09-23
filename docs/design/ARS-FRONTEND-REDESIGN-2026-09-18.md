# ARS public frontend redesign

## Reference interpretation

Inspected five frames across the supplied 22-second UI reference, covering the immersive hero, event grid, visit information and merchandise layout. Extracted its image-first hierarchy, negative space, restrained navigation, date-led cards and repeated section rhythm. Did not reuse its logo, artwork, lime palette, merchandise or exact layout. The supplied video is a design reference, not an ARS hero asset.

ARS direction: charcoal/olive-black surfaces, ivory text, muted champagne accents, editorial serif headings with italic contrast, compact sans-serif navigation and information labels. Cinematic still photography avoids shipping an autoplay reference video or adding a media dependency. Brand photography is separate from actual venue/event photos; missing catalog images remain honestly labelled.

## Architecture and preservation

Mapped the Next.js App Router frontend across public discovery, customer account/checkout/pass routes, and Admin/Owner/Staff portals. Inspected shared navigation, typography, catalog retrieval, discovery filtering, event details, tier selector and route/component dependencies.

The public catalog remains server-loaded from Supabase. Discovery retains its existing venue/genre/date/referral filters and live-search provider. Pass-tier selection, quantity, availability, fee calculation and checkout navigation remain in the existing EventTicketSelector. Protected routes continue to use existing role/ownership checks. No API, database, authentication, payment, ticket, QR or operational-portal logic changed.

New styling is scoped beneath `.hospitality`; operational route prefixes do not receive that class. Existing global operational CSS was not edited. Customer/partner pages inherit the public typography and controls without rewriting their functionality.

## Files changed

- `app/page.tsx`: restructured hero, brand introduction, real tonight/upcoming sections, venue cards, ARS experience story, guest essentials and partnership invitation. Existing catalog calls/date filters preserved.
- `app/hospitality.css`: new scoped palette, typography, spacing, responsive grids, image/card treatments, controls and reduced-motion-aware entrance animation.
- `app/layout.tsx`: imports the new stylesheet; metadata and architecture preserved.
- `components/AppChrome.tsx`: public styling boundary and keyboard skip-to-content target; retains operational chrome exclusion.
- `components/Navbar.tsx`: public header treatment, ARS descriptor and Escape-to-close handling; destinations and toggle state retained.
- `components/Footer.tsx`: redesigned brand statement and navigation; retained discovery, account, owner, staff and contact links.
- `components/EventCard.tsx`: date-led imagery, editorial titles, venue/time metadata, featured description, availability and price/access actions. Existing detail/checkout/referral URLs and sold-out logic preserved.
- `components/CatalogImage.tsx`: adds styling hook to existing unavailable-image state; supported-source checks and image optimization unchanged.
- `app/events/page.tsx`: editorial discovery heading and style hooks; filtering/data logic unchanged.
- `app/events/[eventId]/page.tsx`: presentation scope hook; content, controls and data logic unchanged.

No package dependency added. No business records changed. Local server started with `npm run dev -- --port 3000`.

## Validation

- Website typecheck: PASS.
- Existing test suite: PASS, 113 tests in 10 files.
- Desktop homepage screenshot reviewed at approximately 1280px.
- Mobile homepage and discovery reviewed at 390x844; no document-level horizontal overflow (document 381px, viewport 390px).
- Tablet partnership page reviewed at 820x1180; no document-level horizontal overflow (document 811px, viewport 820px).
- Homepage discovery link: PASS.
- Venue filter submission: PASS; XTREME selection preserved in URL and control.
- No upcoming events currently available: real empty states shown rather than manufactured event data.
- Existing missing venue imagery: branded placeholders rendered and remained labelled unavailable.
- Mobile menu: unresolved runtime check. Toggle actions did not expand the menu in the test browser, including after a reload. Existing toggle implementation retained; not claimed passed.
- Existing event-detail route: unresolved runtime check. `/events/a85e0906-715f-4c98-9de3-5038346ad5f8` remained on its loading view during the browser check. Data-loading logic was not modified.
- Authentication, completed payments, owned passes and physical QR scanning were not end-to-end retested in this design pass.
- Production build was not run in this pass.

The redesign is implemented, but the unresolved browser interactions must be investigated before claiming a complete functional sign-off. Viewport overrides were reset after responsive inspection.
