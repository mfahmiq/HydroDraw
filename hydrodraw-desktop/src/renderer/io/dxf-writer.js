// ==================== DXF WRITER ====================
// Exports HydroDraw elements to DXF format

class DXFWriter {
  constructor() {
    this.content = [];
  }

  write(project) {
    this.content = [];
    
    // Header
    this.writeHeader();
    
    // Tables (layers)
    this.writeTables(project.layers);
    
    // Entities
    this.writeEntities(project.elements, project.layers);
    
    // EOF
    this.addPair(0, 'EOF');
    
    return this.content.join('\n');
  }

  writeHeader() {
    this.addPair(0, 'SECTION');
    this.addPair(2, 'HEADER');
    
    // Version
    this.addPair(9, '$ACADVER');
    this.addPair(1, 'AC1015'); // AutoCAD 2000
    
    // Units
    this.addPair(9, '$INSUNITS');
    this.addPair(70, '4'); // Millimeters
    
    this.addPair(0, 'ENDSEC');
  }

  writeTables(layers) {
    this.addPair(0, 'SECTION');
    this.addPair(2, 'TABLES');
    
    // Layer table
    this.addPair(0, 'TABLE');
    this.addPair(2, 'LAYER');
    this.addPair(70, layers.length.toString());
    
    layers.forEach(layer => {
      this.addPair(0, 'LAYER');
      this.addPair(2, layer.name || layer.id);
      this.addPair(70, layer.locked ? '4' : '0');
      this.addPair(62, this.hexToAci(layer.color).toString());
      this.addPair(6, 'CONTINUOUS');
    });
    
    this.addPair(0, 'ENDTAB');
    this.addPair(0, 'ENDSEC');
  }

  writeEntities(elements, layers) {
    this.addPair(0, 'SECTION');
    this.addPair(2, 'ENTITIES');
    
    elements.forEach(el => {
      const layer = layers.find(l => l.id === el.layerId) || layers[0];
      
      switch (el.type) {
        case 'line':
          this.writeLine(el, layer);
          break;
        case 'polyline':
          this.writePolyline(el, layer);
          break;
        case 'rectangle':
          this.writeRectangle(el, layer);
          break;
        case 'circle':
          this.writeCircle(el, layer);
          break;
        case 'arc':
          this.writeArc(el, layer);
          break;
        case 'text':
          this.writeText(el, layer);
          break;
      }
    });
    
    this.addPair(0, 'ENDSEC');
  }

  writeLine(line, layer) {
    this.addPair(0, 'LINE');
    this.addPair(8, layer.name || layer.id);
    this.addPair(62, this.hexToAci(line.stroke));
    this.addPair(10, line.x1.toFixed(6));
    this.addPair(20, line.y1.toFixed(6));
    this.addPair(30, '0.0');
    this.addPair(11, line.x2.toFixed(6));
    this.addPair(21, line.y2.toFixed(6));
    this.addPair(31, '0.0');
  }

  writePolyline(polyline, layer) {
    if (!polyline.points || polyline.points.length < 2) return;
    
    this.addPair(0, 'LWPOLYLINE');
    this.addPair(8, layer.name || layer.id);
    this.addPair(62, this.hexToAci(polyline.stroke));
    this.addPair(90, polyline.points.length.toString());
    this.addPair(70, polyline.closed ? '1' : '0');
    
    polyline.points.forEach(point => {
      this.addPair(10, point.x.toFixed(6));
      this.addPair(20, point.y.toFixed(6));
    });
  }

  writeRectangle(rect, layer) {
    // Write rectangle as LWPOLYLINE
    this.addPair(0, 'LWPOLYLINE');
    this.addPair(8, layer.name || layer.id);
    this.addPair(62, this.hexToAci(rect.stroke));
    this.addPair(90, '4');
    this.addPair(70, '1'); // Closed
    
    this.addPair(10, rect.x.toFixed(6));
    this.addPair(20, rect.y.toFixed(6));
    this.addPair(10, (rect.x + rect.width).toFixed(6));
    this.addPair(20, rect.y.toFixed(6));
    this.addPair(10, (rect.x + rect.width).toFixed(6));
    this.addPair(20, (rect.y + rect.height).toFixed(6));
    this.addPair(10, rect.x.toFixed(6));
    this.addPair(20, (rect.y + rect.height).toFixed(6));
  }

  writeCircle(circle, layer) {
    this.addPair(0, 'CIRCLE');
    this.addPair(8, layer.name || layer.id);
    this.addPair(62, this.hexToAci(circle.stroke));
    this.addPair(10, circle.cx.toFixed(6));
    this.addPair(20, circle.cy.toFixed(6));
    this.addPair(30, '0.0');
    this.addPair(40, circle.radius.toFixed(6));
  }

  writeArc(arc, layer) {
    this.addPair(0, 'ARC');
    this.addPair(8, layer.name || layer.id);
    this.addPair(62, this.hexToAci(arc.stroke));
    this.addPair(10, arc.cx.toFixed(6));
    this.addPair(20, arc.cy.toFixed(6));
    this.addPair(30, '0.0');
    this.addPair(40, arc.radius.toFixed(6));
    this.addPair(50, arc.startAngle.toFixed(6));
    this.addPair(51, arc.endAngle.toFixed(6));
  }

  writeText(text, layer) {
    this.addPair(0, 'TEXT');
    this.addPair(8, layer.name || layer.id);
    this.addPair(62, this.hexToAci(text.stroke));
    this.addPair(10, text.x.toFixed(6));
    this.addPair(20, text.y.toFixed(6));
    this.addPair(30, '0.0');
    this.addPair(40, (text.height || 10).toFixed(6));
    this.addPair(1, text.text || '');
    if (text.rotation) {
      this.addPair(50, text.rotation.toFixed(6));
    }
  }

  addPair(code, value) {
    this.content.push(code.toString());
    this.content.push(value);
  }

  // Hex color to AutoCAD Color Index
  hexToAci(hex) {
    if (!hex) return 7;
    const color = hex.toUpperCase();
    const colorMap = {
      '#000000': 0,
      '#FF0000': 1,
      '#FFFF00': 2,
      '#00FF00': 3,
      '#00FFFF': 4,
      '#0000FF': 5,
      '#FF00FF': 6,
      '#FFFFFF': 7,
      '#808080': 8,
      '#C0C0C0': 9
    };
    return colorMap[color] || 7;
  }
}

window.DXFWriter = DXFWriter;
