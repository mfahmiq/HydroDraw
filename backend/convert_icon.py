from PIL import Image
import os

img_path = '../frontend/public/logo-hdi.png'
icon_path = 'logo.ico'

if os.path.exists(img_path):
    img = Image.open(img_path)
    img.save(icon_path, format='ICO', sizes=[(256, 256)])
    print(f"Successfully converted {img_path} to {icon_path}")
else:
    print(f"Error: {img_path} not found")
