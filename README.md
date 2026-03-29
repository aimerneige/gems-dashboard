# GEM Dashboard

> Dashboard for Gemini GEM with Tampermonkey sync support.

## Features

- Dashboard for managing Gemini GEMs
- Tampermonkey script to fetch GEMS from Gemini website
- Upload custom icons for each GEM
- Random solid color backgrounds when no icon is uploaded
- Data stored in YAML format
- Modern dark theme UI

## Setup

1. Install dependencies:
```bash
npm install
```

2. Configure the application by editing `config.yaml`:
```yaml
server:
  host: "0.0.0.0"
  port: 3000

storage:
  imagesPath: "./images"
  dataPath: "./data"

app:
  title: "GEM Dashboard"
  description: "Dashboard for Gemini GEM"
```

3. Start the server:
```bash
npm start
```

4. Open http://localhost:3000 in your browser

## Tampermonkey Script

1. Open Tampermonkey in your browser
2. Create a new script
3. Copy the content from `tampermonkey/gems-fetcher.user.js` into the editor
4. Save the script
5. Visit Gemini website and click "Sync GEMS" button to fetch your gems

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | /api/gems | Get all gems |
| GET | /api/gems/:id | Get a single gem |
| POST | /api/gems | Create a new gem |
| PUT | /api/gems/:id | Update a gem |
| DELETE | /api/gems/:id | Delete a gem |
| POST | /api/gems/batch | Batch sync gems |
| POST | /api/upload/:id | Upload icon for a gem |
| DELETE | /api/upload/:id | Remove icon from a gem |

## Gem Data Structure

```yaml
- id: "gem-id-from-url"
  name: "GEM Name"
  url: "https://gemini.google.com/gem/gem-id"
  description: "GEM description"
  icon: "/images/uploaded-image.png"  # optional
```
