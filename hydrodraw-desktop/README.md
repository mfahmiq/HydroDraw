# HydroDraw CAD

**PT Hidro Dinamika Internasional**

CAD 2D ringan untuk drafting teknik, setara AutoCAD awal.

## Fitur

### Core CAD Features
- **Drawing Tools**: Line, Polyline, Rectangle, Circle, Arc, Text
- **Selection**: Click select, Shift multi-select, Window/Crossing selection
- **Transform**: Move, Scale, Rotate dengan grips
- **Editing**: Split, Trim, Extend

### Presisi Engineering
- **Heads-up Input**: Length & Angle input saat drawing
- **Ortho Mode (F8)**: Batasi arah 0°/90°
- **Polar Tracking (F10)**: Snap sudut ke increment (15° default)
- **Koordinat**: Absolute (x,y) dan Relative (dx,dy)

### Snap System
- Grid Snap
- Endpoint Snap
- Midpoint Snap
- Center Snap
- Intersection Snap
- Perpendicular Snap
- Tangent Snap

### Layer Management
- Create/rename/delete layers
- Visibility toggle
- Lock toggle
- Warna per layer

### File Operations
- **New/Open/Save/Save As** dengan dialog Windows native
- Format project: `.hydro` (JSON)
- **DXF Import/Export**: LINE, LWPOLYLINE, CIRCLE, ARC, TEXT
- **PNG Export**

## Keyboard Shortcuts

| Key | Function |
|-----|----------|
| V | Select tool |
| H | Pan tool |
| L | Line tool |
| R | Rectangle tool |
| C | Circle tool |
| T | Text tool |
| M | Move tool |
| Escape | Cancel operation |
| Delete | Delete selected |
| Ctrl+Z | Undo |
| Ctrl+Y | Redo |
| Ctrl+A | Select all |
| Ctrl+S | Save |
| F8 | Toggle Ortho |
| F10 | Toggle Polar |

## Build Instructions (Windows)

### Prerequisites
- Node.js 18+
- Yarn

### Development
```bash
cd hydrodraw-desktop
yarn install
yarn start
```

### Build Installer
```bash
yarn build:win
```

Output:
- `dist/HydroDraw CAD Setup x.x.x.exe` (NSIS installer)
- `dist/hydrodraw-cad-x.x.x-win.zip` (Portable)

## System Requirements

- Windows 10/11 64-bit
- Intel/AMD x64 processor (minimal 2GHz)
- 4GB RAM (8GB recommended)
- 200MB disk space
- 1280x720 display (1920x1080 recommended)

## File Formats

### .hydro (Project File)
JSON-based format containing:
- Elements (lines, circles, etc.)
- Layers
- Canvas settings
- Snap settings

### DXF Support
Import/Export entities:
- LINE
- LWPOLYLINE
- CIRCLE
- ARC
- TEXT
- Layer table

## Architecture

```
hydrodraw-desktop/
├── main.js           # Electron main process
├── preload.js        # Context bridge
├── src/
│   ├── renderer/
│   │   ├── index.html
│   │   ├── app.js      # Main application
│   │   ├── core/       # Geometry, Snap, Editing
│   │   ├── io/         # DXF parser/writer
│   │   └── styles/     # CSS
│   └── assets/
│       └── icon.svg
└── package.json
```

## License

Copyright © 2024 PT Hidro Dinamika Internasional

---

**Version**: 1.0.0
**Build**: Electron 28 + electron-builder
