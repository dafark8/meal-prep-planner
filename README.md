# Meal Prep Planner

A local web app for planning weekly meals, generating grocery lists, and tracking meal history. Runs entirely on your machine — no accounts, no cloud.

---

## Starting the app

Double-click **`Start Meal Prep App.command`** in the project folder.

This starts the local server and opens the app in your browser at `http://localhost:3000`. To stop it, click the **Stop Server** button in the top-right corner of the app.

> If your Mac asks for permission to run the `.command` file the first time: right-click it → Open → Open.

---

## Using the planner

### Weekly workflow

1. **Set your slots** — each row is one dish for the week. Add as many as you need with **+ Add Dish Slot**.
2. **Filter by category** — use the left dropdown on each slot to narrow picks (Sandwich, Pasta, etc.), or leave it on **Wild Card** for any recipe.
3. **Pick Menu** — randomly fills all unlocked slots from the available recipe pool.
4. **Re-roll a slot** — click ↻ on any slot to re-pick just that one.
5. **Lock a slot** — click 🔓 to lock a chosen dish so Pick Menu won't overwrite it.
6. **Generate Grocery List** — builds a combined, de-duped ingredient list from your selected dishes plus any active Evergreen items.
7. **Set Menu** — saves the current menu to the History Log.

### Evergreen items

Always-on staples that get added to every grocery list (eggs, oats, etc.). Toggle individual items off in the sidebar if you don't need them that week.

To add or remove evergreen items, see [Adding an evergreen item](#adding-an-evergreen-item) below.

---

## Adding a recipe

**1. Create a new file** in the `recipes/` folder.

Name it with hyphens, no spaces, `.md` extension. Example: `Chicken-Parm.md`

**2. Use this template:**

```markdown
---
title: Chicken Parm
tags: ["Pasta"]
---

Optional one-line description.

## Ingredients

- 4 chicken breasts
- 2 cups marinara sauce
- 1 cup shredded mozzarella
- Pasta of choice
```

**3. Refresh the browser tab.** No server restart needed.

### Template rules

| Part | Notes |
|---|---|
| `---` blocks | Must be the very first thing in the file, on their own lines |
| `title:` | The name shown in the app — plain text |
| `tags:` | Square brackets and quotes required — e.g. `["Sandwich"]` |
| `## Ingredients` | Must use exactly this heading — two `#` signs |
| `- ` bullet lines | Dash + space before each ingredient |

### Categories (tags)

The category dropdown in the app builds automatically from whatever tags exist in your recipe files. Current tags: **Sandwich**, **Pasta**, **Basic Base**.

- Match an existing tag exactly (case-sensitive) to add the recipe to that category.
- Use a new tag to create a new category — it will appear in the dropdown automatically.
- A recipe can belong to more than one category: `tags: ["Pasta", "Basic Base"]`

### Common mistakes

- Forgetting the second `---` after the metadata block.
- Using `*` or `•` instead of `-` for bullets.
- Mismatched quotes in the tags line.
- Putting notes or descriptions inside the `## Ingredients` section — they won't show in the grocery list but may create odd entries. Keep them above `## Ingredients`.

---

## Adding an evergreen item

Evergreen items are defined in `evergreen.json` in the project root. Open it in any text editor and add an entry following this pattern:

```json
{ "id": "ev-4", "name": "Greek Yogurt", "ingredients": ["Greek yogurt", "Granola"] }
```

Rules:
- `id` must be unique — just increment the number (`ev-4`, `ev-5`, etc.).
- `name` is what appears in the sidebar toggle.
- `ingredients` is a list of strings that get added to the grocery list when the item is toggled on.
- Each entry is separated by a comma. The last entry in the list has no trailing comma.

Save the file and refresh the browser.

---

## Editing or removing a recipe

- **Edit:** Open the `.md` file in the `recipes/` folder and change whatever you need. Refresh the browser.
- **Remove:** Delete the `.md` file. Refresh the browser. The recipe disappears from all dropdowns.

> Deleted recipes won't break the History Log — history stores dish names as plain text, not links to recipe files.

---

## History

The History Log tab shows all menus you've committed with **Set Menu**.

- **Export History** — saves a `.json` file you can back up or move to another machine.
- **Import History** — loads a previously exported `.json` file, replacing the current history.

History is stored in your browser's local storage. Clearing your browser data will erase it — export first if you want to keep it.

---

## File structure reference

```
meal-prep-app/
├── recipes/              ← Add your .md recipe files here
├── evergreen.json        ← Always-on staples
├── history.json          ← Server-side history (not currently used by the app)
├── server.js             ← Local server — do not edit unless you know JS
├── src/
│   ├── app.js            ← Front-end logic
│   └── style.css         ← Visual styles
└── Start Meal Prep App.command  ← Double-click to launch
```

---

## Troubleshooting

**App won't open / blank page**
The server may not have started. Try double-clicking `Start Meal Prep App.command` again. Check that port 3000 isn't in use by another app.

**Recipe not showing up**
Usually a formatting issue in the `.md` file. Check: does the file have the opening and closing `---` lines? Is the `tags:` line exactly `["TagName"]` with quotes and brackets?

**Category dropdown missing a category**
The dropdown is built from the tags in your recipe files. If a tag isn't showing, check for a typo in the recipe's `tags:` line — it's case-sensitive.

**Grocery list is empty**
Make sure you've selected recipes in the slots AND clicked **Generate Grocery List** (not just Pick Menu).
