// ==================== HYDRO FILE FORMAT ====================
// .hydro file format handler (JSON-based)

const HYDRO_VERSION = '1.0.0';

class HydroFormat {
  // Create new empty project
  static createNew() {
    return {
      version: HYDRO_VERSION,
      name: 'Untitled',
      created: new Date().toISOString(),
      modified: new Date().toISOString(),
      settings: {
        gridSize: 10,
        gridEnabled: true,
        snapEnabled: true,
        orthoEnabled: false,
        polarEnabled: false,
        polarIncrement: 15,
        snapSettings: {
          grid: true,
          endpoint: true,
          midpoint: true,
          center: true,
          intersection: true,
          perpendicular: false,
          tangent: false
        }
      },
      canvas: {
        width: 2000,
        height: 1500,
        backgroundColor: '#1a1a2e'
      },
      layers: [
        {
          id: 'layer_0',
          name: 'Layer 0',
          visible: true,
          locked: false,
          color: '#FFFFFF'
        }
      ],
      elements: []
    };
  }

  // Serialize project to JSON string
  static serialize(project) {
    const data = {
      ...project,
      version: HYDRO_VERSION,
      modified: new Date().toISOString()
    };
    return JSON.stringify(data, null, 2);
  }

  // Parse JSON string to project
  static parse(jsonString) {
    try {
      const data = JSON.parse(jsonString);
      
      // Validate version
      if (!data.version) {
        console.warn('No version found in file, assuming v1.0.0');
        data.version = '1.0.0';
      }
      
      // Ensure required fields exist
      data.settings = data.settings || this.createNew().settings;
      data.canvas = data.canvas || this.createNew().canvas;
      data.layers = data.layers || this.createNew().layers;
      data.elements = data.elements || [];
      
      // Validate and fix element IDs
      data.elements = data.elements.map(el => {
        if (!el.id) {
          el.id = this.generateId();
        }
        return el;
      });
      
      return {
        success: true,
        project: data
      };
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }

  // Import from DXF
  static importDXF(dxfContent) {
    const parser = new DXFParser();
    const result = parser.parse(dxfContent);
    
    const project = this.createNew();
    project.elements = result.elements;
    
    // Merge layers
    if (result.layers.length > 0) {
      project.layers = result.layers.map(l => ({
        id: l.id || l.name,
        name: l.name,
        visible: l.visible !== false,
        locked: l.locked === true,
        color: l.color || '#FFFFFF'
      }));
    }
    
    return {
      success: true,
      project,
      warnings: result.warnings
    };
  }

  // Export to DXF
  static exportDXF(project) {
    const writer = new DXFWriter();
    return writer.write(project);
  }

  // Export to PNG (returns data URL)
  static exportPNG(svgElement, backgroundColor = '#FFFFFF') {
    return new Promise((resolve, reject) => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      
      const svgData = new XMLSerializer().serializeToString(svgElement);
      const svgBlob = new Blob([svgData], { type: 'image/svg+xml;charset=utf-8' });
      const url = URL.createObjectURL(svgBlob);
      
      const img = new Image();
      img.onload = () => {
        canvas.width = img.width;
        canvas.height = img.height;
        
        // Background
        ctx.fillStyle = backgroundColor;
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        
        // Draw SVG
        ctx.drawImage(img, 0, 0);
        
        URL.revokeObjectURL(url);
        resolve(canvas.toDataURL('image/png'));
      };
      img.onerror = reject;
      img.src = url;
    });
  }

  static generateId() {
    return 'el_' + Math.random().toString(36).substr(2, 9) + '_' + Date.now().toString(36);
  }
}

window.HydroFormat = HydroFormat;
window.HYDRO_VERSION = HYDRO_VERSION;
