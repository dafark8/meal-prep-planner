const express = require('express');
const path = require('path');
const fs = require('fs');
const matter = require('gray-matter');

const app = express();
const PORT = 3000;

const RECIPES_DIR = path.join(__dirname, 'recipes');
const EVERGREEN_FILE = path.join(__dirname, 'evergreen.json');
const HISTORY_FILE = path.join(__dirname, 'history.json');

app.use(express.json());
app.use(express.static(__dirname));

// GET /api/recipes
app.get('/api/recipes', (req, res) => {
  try {
    const files = fs.readdirSync(RECIPES_DIR).filter(f => f.endsWith('.md'));
    const recipes = files.map(filename => {
      const raw = fs.readFileSync(path.join(RECIPES_DIR, filename), 'utf-8');
      const parsed = matter(raw);
      const { title, tags } = parsed.data;

      // Extract ingredients from body under ## Ingredients heading
      const body = parsed.content || '';
      const lines = body.split('\n');
      let inIngredients = false;
      const ingredients = [];
      for (const line of lines) {
        if (/^##\s+Ingredients/i.test(line.trim())) {
          inIngredients = true;
          continue;
        }
        if (inIngredients) {
          if (/^##/.test(line.trim())) break; // next heading stops parsing
          const match = line.match(/^-\s+(.+)/);
          if (match) {
            ingredients.push(match[1].trim());
          }
        }
      }

      const id = filename.replace('.md', '');
      return { id, title: title || id, tags: tags || [], ingredients, filename };
    });
    res.json(recipes);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to load recipes', details: err.message });
  }
});

// GET /api/evergreen
app.get('/api/evergreen', (req, res) => {
  try {
    const data = JSON.parse(fs.readFileSync(EVERGREEN_FILE, 'utf-8'));
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: 'Failed to load evergreen data', details: err.message });
  }
});

// GET /api/history
app.get('/api/history', (req, res) => {
  try {
    const data = JSON.parse(fs.readFileSync(HISTORY_FILE, 'utf-8'));
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: 'Failed to load history', details: err.message });
  }
});

// POST /api/history — append one entry
app.post('/api/history', (req, res) => {
  try {
    const { entry } = req.body;
    if (!entry) return res.status(400).json({ error: 'Missing entry in request body' });
    const current = JSON.parse(fs.readFileSync(HISTORY_FILE, 'utf-8'));
    current.push(entry);
    fs.writeFileSync(HISTORY_FILE, JSON.stringify(current, null, 2), 'utf-8');
    res.json(current);
  } catch (err) {
    res.status(500).json({ error: 'Failed to save history entry', details: err.message });
  }
});

// POST /api/history/overwrite — completely replace history
app.post('/api/history/overwrite', (req, res) => {
  try {
    const { data } = req.body;
    if (!Array.isArray(data)) return res.status(400).json({ error: 'Body must include a "data" array' });
    fs.writeFileSync(HISTORY_FILE, JSON.stringify(data, null, 2), 'utf-8');
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: 'Failed to overwrite history', details: err.message });
  }
});

// POST /api/shutdown — gracefully stop the server
app.post('/api/shutdown', (req, res) => {
  res.json({ message: 'Server shutting down.' });
  setTimeout(() => process.exit(0), 300);
});

app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});
