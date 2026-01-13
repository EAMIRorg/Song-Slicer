# Song Slicer

## Purpose
This 1.0 app can be used by people with no programming experience to segment songs into its form sections. 

## Dev setup
### Requirements
- Node.js (tested with 23.x)
- Python 3 (3.10+ recommended)

### Install
1) Run the first-time setup script:
```
npm run first-run
```
2) Run the app:
```
npm start
```

### Windows first-run
If you're on Windows, you can run:
```
powershell -ExecutionPolicy Bypass -File scripts/first-run.ps1
```

### Manual install (if you prefer)
1) Install Node dependencies:
```
npm install
```
2) Create a Python virtual environment and install Python deps:
```
python3 -m venv venv
./venv/bin/pip install -r requirements.txt
```
3) Run the app:
```
npm start
```

### Python notes
- The app starts a local Flask server on port 5001 by default.
- You can override the Python interpreter with `PYTHON=/path/to/python npm start`.
- You can override the port with `PY_SERVER_PORT=5001`.

### Troubleshooting
- `ModuleNotFoundError: flask`: install Python deps in the venv (`./venv/bin/pip install -r requirements.txt`).
- `OSError: [Errno 48] Address already in use`: another server is on port 5001. Stop it or change `PY_SERVER_PORT`.

## Releases
This project uses Electron Forge for packaging.

### Icons
- macOS: `resources/icons/EAMIR.icns`
- Windows: `resources/icons/EAMIR.ico`

### Build
```
npm run make
```

### Codesign + notarize (macOS)
1) Store credentials in Keychain (one time):
```
xcrun notarytool store-credentials "eamir-notary" \
  --apple-id "vj@vjmanzo.com" \
  --team-id "HSAYDGFEVC" \
  --password "YOUR_APP_SPECIFIC_PASSWORD"
```
2) Create a `signing.env` file (see `signing.env.example`) if you want to override the profile name.
3) Run:
```
./build-and-sign.sh
```

### CSS
Using System.css project
- should be all set to be used offline. If there's gaps in the ui use the internet version with the link.
- Some icons used from https://iconoir.com/
