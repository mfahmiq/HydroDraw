
import os
import sys
import threading
import uvicorn
import webview
from fastapi.staticfiles import StaticFiles
from pathlib import Path

# Import the existing app
# We need to add the current directory to path so imports work correctly when frozen
if getattr(sys, 'frozen', False):
    sys.path.append(sys._MEIPASS)

from server import app

# Determine paths
if getattr(sys, 'frozen', False):
    # Frozen (PyInstaller)
    base_dir = sys._MEIPASS
    # We will bundle 'frontend/build' into a folder named 'web_build' inside the exe
    static_dir = os.path.join(base_dir, 'web_build')
else:
    # Dev mode
    base_dir = os.path.dirname(os.path.abspath(__file__))
    static_dir = os.path.join(base_dir, '..', 'frontend', 'build')

# Mount the static directory
if os.path.exists(static_dir):
    print(f"Mounting static files from: {static_dir}")
    app.mount("/", StaticFiles(directory=static_dir, html=True), name="static")
else:
    print(f"ERROR: Static directory not found at {static_dir}")

def start_server():
    # Run the server on a specific internal port
    # log_level="error" to reduce console noise in the background
    uvicorn.run(app, host="127.0.0.1", port=49152, log_level="info")

if __name__ == '__main__':
    # Start the local server in a separate thread
    t = threading.Thread(target=start_server, daemon=True)
    t.start()
    
    # Create the native window pointing to the local server
    webview.create_window(
        title='HidroDraw CAD', 
        url='http://127.0.0.1:49152',
        width=1280, 
        height=800,
        resizable=True
    )
    
    # Start the webview GUI loop
    webview.start()
