# Hevelius Web Interface Changelog

0.6.0 (unreleased)

- Added tags for asteroids (families such as amor/NEO/PHA, fast rotators,
  visited by spacecraft, etc.): filter the Asteroids list by one or more
  tags (match any or all), see tags as colored chips in the list, and
  add/remove tags for a single asteroid from its detail page — typing a
  name that doesn't exist yet creates the tag and attaches it in one step.
- Added **Asteroids** page (`/asteroids`) listing minor planets from the MPC
  catalogue, with paging, sorting, and filtering (designation, number,
  numbered/provisional, absolute magnitude range); click a row to view an
  asteroid's full orbital element details (`/asteroids/:id`).
- Detailed telescope view extended: many new parameters shown (F number,
  default rotation, camera details, FOV etc).
- Default camera rotation for a telescope is now supported.
- Camera rotation for a project is now supported.
- Sky Map page (`/sky-map`) shows active projects on an Aladin Lite all-sky view
  with per-telescope FOV overlays and scope filters.
- Project detail includes a Sky View (DSS) with the project FOV rectangle.
- Optical parameters (focal length, sensor size, pixel pitch) can be set when
  creating or editing a project; create form auto-fills from the selected telescope.

0.5.0 (2026-05-27)

- Tweaked the interface to be more phone friendly
- Project publications added (custom icons for AstroBin, astropolis.pl, Facebook, X, Flickr and more)
- Renamed **Catalogs** page to **Objects** (`/objects`); menu label and top bar updated.
- Added **Catalogs** page (`/catalogs`) listing installed catalogs with object counts;
  sort by count or name; tap/click opens Objects filtered by that catalog.
- Proximity search in Objects implemented (you can specify RA,dec and radius)
- Objects filtering: catalog picker from installed catalogs, name/altname search,
  constellation autocomplete, and coordinate proximity (RA, decl, radius in degrees).
- Objects and Catalogs layouts adapt to narrow screens (card list on phones, table on wider viewports).
- The projects support added
- Login auth contract updated: frontend now sends plaintext password over HTTPS
  for backend verification
- Backend password hashing migrated from MD5 to Argon2id
- Removed `ts-md5` dependency and client-side MD5 hashing code
- Removed hammerjs dependency
- Cleaned up API debugging docs to match the new login contract
- Angular/CDK and other dependencies migrated to 21
- User profile
- Gravatar support
- User experience improved when adding new project: the object is looked up in
  the catalog and RA/DEC coords are set if found
- Massive projects enhancements: subframes presentation improved, added many new
  fields, sorting, better editing, deleting projects, checking for similar existing
  projects when adding a new one etc.
- The session timeout is extended if there's any activity.

0.4.0 (2026-03-27)

- Upgraded to Angular 19, then 20, then 21
- Removed old test runner (Karma/Jasmine), migrated to vitest
- Removed lots of old dependencies
- Added About panel
- Fixed ExpressionChangedAfterItHasBeenCheckedError exception
- The footer on login page now has links to a ChangeLog
- Fixed catalog sorting and filtering
- dev: OpenAPI synchronization with backend
- Filters support added
- Telescopes list can now be sorted, edited
- Sensors support added

0.3.0 (2025-04-22)

- Pagination for tasks added
- Sorting for tasks added
- Filtering for tasks added
- Telescopes list added
- Catalogs (currently NGC,IC,Messier,Caldwell) added
- When adding or editing tasks, it's now possible to select a scope
  from the list
- When adding or editing tasks, the target object can be selected
  from the catalogs. Just type at least 3 chars.

0.2.0 (2025-04-13)

- Added ability to edit tasks (long press a task)
- Doc cleaned up
- Updated github workflows, cleaned up some old tests
- The backend version is now reported on the login page
- Menu redesigned to be more user friendly
- Night plan implemented (experimental)
- The title now shows the number of tasks in the night plan
- Better login (ability to log out, handling token expiration)

0.1.0 (2025-03-02)

- Updated messages to use SnackBar instead of console log prints
- Cleaned up LoginService to always return a proper structure
- RA, Dec now formatted using sexagesimal format
- Upgraded to Angular 17, then 18
- Addressed es-linter issues
- Removed old, unused PHP code for the server-side API
- JWT support added
- Implemented adding new tasks

0.0.4 (2023-11-17)

- Upgraded to Angular 16
- tslint replaced with es-lint
- fixed all tests
- github workflow added

0.0.3 (2023-01-03)

- Upgraded to Angular 10
- the API URL is now configured in one place
- the tasks list remains broken

0.0.2 (2019 Jul 9)

- increased default view to 1000 tasks
- states column is now interpreted correctly
- Changelog added
- user AAVSO logins are now displayed

0.0.1 (2019 Feb)

- Initial version with limited capabilities (login, able to list 10 tasks,
  without any interpretation)
