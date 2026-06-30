# EdgEducate Flashcard Creator

A complete interactive flashcard web app for students and teachers, built with only HTML, CSS, and JavaScript.

It is designed for:
- Primary school
- Secondary school
- VCE

The app works with:
- Local file opening (open `index.html` directly)
- GitHub Pages hosting

## What the app does

The app provides:
- Dashboard overview
- Public Library (read-only sets from JSON files)
- My Flashcards (Local Storage sets)
- Create, edit, delete, duplicate sets
- Study mode and review mode
- Flip card animation
- Next, previous, shuffle, restart
- Mark as Known / Needs Revision
- Search flashcards
- Import JSON with validation, sanitisation, and preview
- Export JSON backups
- Statistics and progress tracking
- Settings
- Responsive desktop/tablet/mobile layout

## Project structure

Save files in:

- `E:\Edgeducate\Software\Other\FlashCards\index.html`
- `E:\Edgeducate\Software\Other\FlashCards\style.css`
- `E:\Edgeducate\Software\Other\FlashCards\script.js`
- `E:\Edgeducate\Software\Other\FlashCards\README.md`
- `E:\Edgeducate\Software\Other\FlashCards\PublicLibrary\fractions-basics.json`
- `E:\Edgeducate\Software\Other\FlashCards\PublicLibrary\algebra-basics.json`
- `E:\Edgeducate\Software\Other\FlashCards\PublicLibrary\science-forces.json`

## How to open locally

1. Open folder `E:\Edgeducate\Software\Other\FlashCards`.
2. Double-click `index.html`.
3. The app will open in your browser.

## Public flashcard library

Public sets are stored in:
- `PublicLibrary/fractions-basics.json`
- `PublicLibrary/algebra-basics.json`
- `PublicLibrary/science-forces.json`

Users can:
- Browse public sets
- Load and study public sets
- Use public cards as read-only cards

Public sets cannot be edited or deleted from the app.

## Create your own flashcards

1. Go to **Create Flashcards**.
2. Enter title, subject, year level, description.
3. Add cards (front/back).
4. Save set.
5. Find it in **My Flashcards**.

In **My Flashcards**, users can:
- Study
- Edit
- Delete
- Duplicate
- Search

## How Local Storage works

Because GitHub Pages has no backend:
- User-created sets are saved in browser Local Storage.
- Data stays on the same browser/device.
- Clearing browser storage will remove saved sets and progress.

Public JSON files are separate from Local Storage and remain read-only.

## Import JSON flashcards

Import flow includes these protections:

1. User selects JSON file
2. App checks extension (`.json` only)
3. App checks size (max 1 MB)
4. App parses with `JSON.parse` in `try/catch`
5. App validates flashcard set format
6. App sanitises text fields
7. App previews cards
8. User confirms import
9. App stores only validated data in Local Storage

Security behavior:
- Reject non-JSON files
- Reject invalid JSON
- Reject invalid structure
- Block HTML tags in imported text
- No `eval()`
- No `Function()`
- Imported/user text rendered safely with `textContent`
- Limits applied for set/card sizes and text lengths
- Duplicate card IDs are replaced with safe IDs

## Export JSON flashcards

Export rules:
- Exports only the user's own sets
- Does not export browser settings
- Does not export private browser data
- Exports clean JSON format only
- Uses safe file names
- Includes no executable code

## Add new public JSON files

To add a new public library set:

1. Create a new `.json` file in `PublicLibrary/`.
2. Use this format:

```json
{
  "title": "Fractions Basics",
  "subject": "Mathematics",
  "yearLevel": "Year 5",
  "description": "Introduction to fractions",
  "cards": [
    {
      "id": 1,
      "front": "What is a numerator?",
      "back": "The top number in a fraction."
    }
  ]
}
```

3. Add the file name to `PUBLIC_MANIFEST` in `script.js`.
4. Reload the app.

## GitHub setup and push instructions

1. Open Command Prompt or Git Bash
2. Go to the project folder:

```bash
cd /d E:\Edgeducate\Software\Other\FlashCards
```

3. Initialise Git if needed:

```bash
git init
```

4. Connect the GitHub repository:

```bash
git remote add origin https://github.com/zwh19921116-crypto/FlashcardCreator.git
```

5. Add files:

```bash
git add .
```

6. Commit files:

```bash
git commit -m "Initial flashcard app"
```

7. Push to GitHub:

```bash
git branch -M main
git push -u origin main
```

8. Enable GitHub Pages:
- Go to the GitHub repository
- Click **Settings**
- Click **Pages**
- Under **Source**, choose **Deploy from branch**
- Choose **main** branch
- Choose **/root**
- Click **Save**

## Notes

- No login required
- No backend required
- No database required
- No paid tools required
- Works as a static web app on GitHub Pages
