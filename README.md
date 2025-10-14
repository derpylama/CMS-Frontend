# CMS Frontend

A beautiful description


## Project Structure
- `/.dev` contains dev tests and stuff we dont care about
    - `/.dev/reversing` contains stuff in the work of reverse engineering elias.ntigskovde.se
- `/app` contains the app
    - `/app/css` contains all css
    - `/app/js` contains all frontend js 
- `/boilerplate` contains the setup code for electron
    - `main.js` entrypoint
    - `preload.js` ??

## Code Formatting
- `Classes` are `PascalCase`
    - Public methods are `PascalCase`
    - Private methods are `camelCase` or `_camelCase` 
- `Functions` are `camelCase`
- `Variables` are `camelCase`
- `Constant variables` are `UPPER_SNAKE_CASE`
- `HTML-Element-Ids` are `kebab-case` (all lowercase)
- `HTML-Element-Classes` are `kebab-case`
- Indentation is four spaces
- Curly brackets for functions and classes have a space before them so `class API {` not `class API{` and `function Func() {` not `function Func(){`

## Code best practise
- HTML property order:
    1. ID
    2. CLASS
    3. (FOR)
    4. (TYPE)
    5. (NAME)
    6. (DATA)
    7. Style
    8. VALUE
- CSS place colors and reusable styles in `:root` then use `var(--)` throughout the file.
- CSS responsive, use `rem` or `em` units.


## Features
- Add a page with CSS styling HTML content and options (dropdowns for options and toggle-button for language)
- Se all pages on the CMS (previews?)
- Edit a page all the fields above (this GETS the page then on save DELETE old and UPLOAD new)
- Remove a page

Later
- Inject a compatible tag that is hidden in our app with more meta data (ex. owner)
- Possibly abstract a more complex storage model into the API layout.
- A more visual editor