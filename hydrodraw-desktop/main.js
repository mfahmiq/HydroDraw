const { app, BrowserWindow, ipcMain, dialog, Menu } = require('electron');
const path = require('path');
const fs = require('fs');

let mainWindow;
let currentFilePath = null;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1600,
    height: 900,
    minWidth: 1200,
    minHeight: 700,
    title: 'HydroDraw CAD - PT Hidro Dinamika Internasional',
    icon: path.join(__dirname, 'src/assets/icon.png'),
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js')
    }
  });

  mainWindow.loadFile('src/renderer/index.html');
  
  // Remove menu in production, keep for dev
  if (!process.argv.includes('--dev')) {
    mainWindow.setMenu(null);
  }

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});

// ==================== FILE OPERATIONS ====================

// New File
ipcMain.handle('file:new', async () => {
  currentFilePath = null;
  updateTitle();
  return { success: true };
});

// Open File
ipcMain.handle('file:open', async () => {
  const result = await dialog.showOpenDialog(mainWindow, {
    title: 'Open HydroDraw Project',
    filters: [
      { name: 'HydroDraw Project', extensions: ['hydro'] },
      { name: 'DXF File', extensions: ['dxf'] },
      { name: 'All Files', extensions: ['*'] }
    ],
    properties: ['openFile']
  });

  if (result.canceled || result.filePaths.length === 0) {
    return { success: false, canceled: true };
  }

  const filePath = result.filePaths[0];
  const ext = path.extname(filePath).toLowerCase();

  try {
    const content = fs.readFileSync(filePath, 'utf8');
    currentFilePath = ext === '.hydro' ? filePath : null;
    updateTitle();
    
    return {
      success: true,
      filePath,
      content,
      format: ext === '.dxf' ? 'dxf' : 'hydro'
    };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

// Save File
ipcMain.handle('file:save', async (event, data) => {
  if (!currentFilePath) {
    return await saveAs(data);
  }
  
  try {
    fs.writeFileSync(currentFilePath, data, 'utf8');
    return { success: true, filePath: currentFilePath };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

// Save As
ipcMain.handle('file:saveAs', async (event, data) => {
  return await saveAs(data);
});

async function saveAs(data) {
  const result = await dialog.showSaveDialog(mainWindow, {
    title: 'Save HydroDraw Project',
    defaultPath: currentFilePath || 'untitled.hydro',
    filters: [
      { name: 'HydroDraw Project', extensions: ['hydro'] }
    ]
  });

  if (result.canceled) {
    return { success: false, canceled: true };
  }

  try {
    fs.writeFileSync(result.filePath, data, 'utf8');
    currentFilePath = result.filePath;
    updateTitle();
    return { success: true, filePath: result.filePath };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

// Export DXF
ipcMain.handle('file:exportDXF', async (event, dxfContent) => {
  const result = await dialog.showSaveDialog(mainWindow, {
    title: 'Export DXF',
    defaultPath: 'drawing.dxf',
    filters: [
      { name: 'DXF File', extensions: ['dxf'] }
    ]
  });

  if (result.canceled) {
    return { success: false, canceled: true };
  }

  try {
    fs.writeFileSync(result.filePath, dxfContent, 'utf8');
    return { success: true, filePath: result.filePath };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

// Import DXF
ipcMain.handle('file:importDXF', async () => {
  const result = await dialog.showOpenDialog(mainWindow, {
    title: 'Import DXF',
    filters: [
      { name: 'DXF File', extensions: ['dxf'] }
    ],
    properties: ['openFile']
  });

  if (result.canceled || result.filePaths.length === 0) {
    return { success: false, canceled: true };
  }

  try {
    const content = fs.readFileSync(result.filePaths[0], 'utf8');
    return { success: true, content, filePath: result.filePaths[0] };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

// Export PNG
ipcMain.handle('file:exportPNG', async (event, dataUrl) => {
  const result = await dialog.showSaveDialog(mainWindow, {
    title: 'Export PNG',
    defaultPath: 'drawing.png',
    filters: [
      { name: 'PNG Image', extensions: ['png'] }
    ]
  });

  if (result.canceled) {
    return { success: false, canceled: true };
  }

  try {
    const base64Data = dataUrl.replace(/^data:image\/png;base64,/, '');
    fs.writeFileSync(result.filePath, base64Data, 'base64');
    return { success: true, filePath: result.filePath };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

function updateTitle() {
  const fileName = currentFilePath ? path.basename(currentFilePath) : 'Untitled';
  mainWindow.setTitle(`${fileName} - HydroDraw CAD`);
}
