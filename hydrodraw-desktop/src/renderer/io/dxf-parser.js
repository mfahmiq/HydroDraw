// ==================== DXF PARSER ====================
// Parses DXF files and converts to HydroDraw format

class DXFParser {
  constructor() {
    this.warnings = [];
  }

  parse(dxfContent) {
    this.warnings = [];
    const lines = dxfContent.split(/\r?\n/);
    const elements = [];
    const layers = new Map();
    
    let i = 0;
    let currentSection = null;
    
    while (i < lines.length) {
      const code = parseInt(lines[i], 10);
      const value = lines[i + 1]?.trim();
      
      if (code === 0 && value === 'SECTION') {
        i += 2;
        if (parseInt(lines[i], 10) === 2) {
          currentSection = lines[i + 1]?.trim();
          i += 2;
        }
        continue;
      }
      
      if (code === 0 && value === 'ENDSEC') {
        currentSection = null;
        i += 2;
        continue;
      }
      
      // Parse TABLES section for layers
      if (currentSection === 'TABLES' && code === 0 && value === 'LAYER') {
        const layer = this.parseLayer(lines, i + 2);
        if (layer) {
          layers.set(layer.name, layer);
        }
        i += 2;
        continue;
      }
      
      // Parse ENTITIES section
      if (currentSection === 'ENTITIES' && code === 0) {
        let entity = null;
        
        switch (value) {
          case 'LINE':
            entity = this.parseLine(lines, i + 2);
            break;
          case 'LWPOLYLINE':
          case 'POLYLINE':
            entity = this.parsePolyline(lines, i + 2);
            break;
          case 'CIRCLE':
            entity = this.parseCircle(lines, i + 2);
            break;
          case 'ARC':
            entity = this.parseArc(lines, i + 2);
            break;
          case 'TEXT':
          case 'MTEXT':
            entity = this.parseText(lines, i + 2);
            break;
          default:
            if (value && value !== 'ENDSEC' && value !== 'EOF') {
              this.warnings.push(`Skipped unsupported entity: ${value}`);
            }
        }
        
        if (entity) {
          elements.push(entity);
        }
      }
      
      i += 2;
    }
    
    // Convert layers map to array
    const layersArray = Array.from(layers.values());
    if (layersArray.length === 0) {
      layersArray.push({
        id: '0',
        name: '0',
        visible: true,
        locked: false,
        color: '#FFFFFF'
      });
    }
    
    return {
      elements,
      layers: layersArray,
      warnings: this.warnings
    };
  }

  parseLayer(lines, startIndex) {
    let i = startIndex;
    const layer = {
      id: '',
      name: '',
      visible: true,
      locked: false,
      color: '#FFFFFF'
    };
    
    while (i < lines.length) {
      const code = parseInt(lines[i], 10);
      const value = lines[i + 1]?.trim();
      
      if (code === 0) break;
      
      switch (code) {
        case 2:
          layer.name = value;
          layer.id = value;
          break;
        case 62:
          layer.color = this.aciToHex(parseInt(value, 10));
          break;
        case 70:
          const flags = parseInt(value, 10);
          layer.locked = (flags & 4) !== 0;
          layer.visible = (flags & 1) === 0;
          break;
      }
      
      i += 2;
    }
    
    return layer.name ? layer : null;
  }

  parseLine(lines, startIndex) {
    let i = startIndex;
    const line = {
      id: this.generateId(),
      type: 'line',
      x1: 0, y1: 0, x2: 0, y2: 0,
      stroke: '#FFFFFF',
      strokeWidth: 1,
      layerId: '0'
    };
    
    while (i < lines.length) {
      const code = parseInt(lines[i], 10);
      const value = lines[i + 1]?.trim();
      
      if (code === 0) break;
      
      switch (code) {
        case 8: line.layerId = value; break;
        case 10: line.x1 = parseFloat(value); break;
        case 20: line.y1 = parseFloat(value); break;
        case 11: line.x2 = parseFloat(value); break;
        case 21: line.y2 = parseFloat(value); break;
        case 62: line.stroke = this.aciToHex(parseInt(value, 10)); break;
      }
      
      i += 2;
    }
    
    return line;
  }

  parsePolyline(lines, startIndex) {
    let i = startIndex;
    const polyline = {
      id: this.generateId(),
      type: 'polyline',
      points: [],
      closed: false,
      stroke: '#FFFFFF',
      strokeWidth: 1,
      layerId: '0'
    };
    
    let vertexCount = 0;
    let currentX = 0, currentY = 0;
    
    while (i < lines.length) {
      const code = parseInt(lines[i], 10);
      const value = lines[i + 1]?.trim();
      
      if (code === 0 && value !== 'VERTEX') break;
      
      switch (code) {
        case 8: polyline.layerId = value; break;
        case 10:
          currentX = parseFloat(value);
          break;
        case 20:
          currentY = parseFloat(value);
          polyline.points.push({ x: currentX, y: currentY });
          break;
        case 70:
          polyline.closed = (parseInt(value, 10) & 1) !== 0;
          break;
        case 90:
          vertexCount = parseInt(value, 10);
          break;
        case 62: polyline.stroke = this.aciToHex(parseInt(value, 10)); break;
      }
      
      i += 2;
    }
    
    return polyline.points.length >= 2 ? polyline : null;
  }

  parseCircle(lines, startIndex) {
    let i = startIndex;
    const circle = {
      id: this.generateId(),
      type: 'circle',
      cx: 0, cy: 0, radius: 0,
      stroke: '#FFFFFF',
      strokeWidth: 1,
      layerId: '0'
    };
    
    while (i < lines.length) {
      const code = parseInt(lines[i], 10);
      const value = lines[i + 1]?.trim();
      
      if (code === 0) break;
      
      switch (code) {
        case 8: circle.layerId = value; break;
        case 10: circle.cx = parseFloat(value); break;
        case 20: circle.cy = parseFloat(value); break;
        case 40: circle.radius = parseFloat(value); break;
        case 62: circle.stroke = this.aciToHex(parseInt(value, 10)); break;
      }
      
      i += 2;
    }
    
    return circle;
  }

  parseArc(lines, startIndex) {
    let i = startIndex;
    const arc = {
      id: this.generateId(),
      type: 'arc',
      cx: 0, cy: 0, radius: 0,
      startAngle: 0, endAngle: 360,
      stroke: '#FFFFFF',
      strokeWidth: 1,
      layerId: '0'
    };
    
    while (i < lines.length) {
      const code = parseInt(lines[i], 10);
      const value = lines[i + 1]?.trim();
      
      if (code === 0) break;
      
      switch (code) {
        case 8: arc.layerId = value; break;
        case 10: arc.cx = parseFloat(value); break;
        case 20: arc.cy = parseFloat(value); break;
        case 40: arc.radius = parseFloat(value); break;
        case 50: arc.startAngle = parseFloat(value); break;
        case 51: arc.endAngle = parseFloat(value); break;
        case 62: arc.stroke = this.aciToHex(parseInt(value, 10)); break;
      }
      
      i += 2;
    }
    
    return arc;
  }

  parseText(lines, startIndex) {
    let i = startIndex;
    const text = {
      id: this.generateId(),
      type: 'text',
      x: 0, y: 0,
      text: '',
      height: 10,
      rotation: 0,
      stroke: '#FFFFFF',
      layerId: '0'
    };
    
    while (i < lines.length) {
      const code = parseInt(lines[i], 10);
      const value = lines[i + 1]?.trim();
      
      if (code === 0) break;
      
      switch (code) {
        case 8: text.layerId = value; break;
        case 10: text.x = parseFloat(value); break;
        case 20: text.y = parseFloat(value); break;
        case 1: text.text = value; break;
        case 40: text.height = parseFloat(value); break;
        case 50: text.rotation = parseFloat(value); break;
        case 62: text.stroke = this.aciToHex(parseInt(value, 10)); break;
      }
      
      i += 2;
    }
    
    return text.text ? text : null;
  }

  // AutoCAD Color Index to Hex
  aciToHex(aci) {
    const colors = {
      0: '#000000', // ByBlock
      1: '#FF0000', // Red
      2: '#FFFF00', // Yellow
      3: '#00FF00', // Green
      4: '#00FFFF', // Cyan
      5: '#0000FF', // Blue
      6: '#FF00FF', // Magenta
      7: '#FFFFFF', // White
      8: '#808080', // Gray
      9: '#C0C0C0', // Light Gray
    };
    return colors[aci] || '#FFFFFF';
  }

  generateId() {
    return 'dxf_' + Math.random().toString(36).substr(2, 9);
  }
}

window.DXFParser = DXFParser;
