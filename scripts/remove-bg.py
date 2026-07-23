#!/usr/bin/env python3
"""Remove background from PNG images using PIL."""

import os
from PIL import Image
import numpy as np

def remove_background_simple(input_path, output_path, threshold=240):
    """
    Remove white/light background from PNG image.
    Uses simple threshold-based approach.
    """
    img = Image.open(input_path).convert('RGBA')
    data = np.array(img)
    
    # Get RGB channels
    r, g, b, a = data[:,:,0], data[:,:,1], data[:,:,2], data[:,:,3]
    
    # Calculate luminance (brightness)
    luminance = (r.astype(int) + g.astype(int) + b.astype(int)) / 3
    
    # Make background (bright areas) transparent
    mask = luminance < threshold
    data[:,:,3] = mask.astype(np.uint8) * 255
    
    result = Image.fromarray(data, 'RGBA')
    result.save(output_path)
    print(f"✓ Saved: {output_path}")

def remove_background_smart(input_path, output_path):
    """
    Remove background using color clustering (for logos with solid background).
    Detects the most common color and removes it.
    """
    img = Image.open(input_path).convert('RGBA')
    data = np.array(img)
    
    # Get RGB channels
    rgb = data[:,:,:3]
    
    # Reshape to 2D for clustering
    pixels = rgb.reshape(-1, 3)
    
    # Find most common color (background)
    from collections import Counter
    colors = [tuple(p) for p in pixels]
    most_common_color = Counter(colors).most_common(1)[0][0]
    
    # Create mask: pixels that match background color become transparent
    mask = np.all(rgb == most_common_color, axis=2)
    data[mask, 3] = 0  # Set alpha to 0 for background
    
    result = Image.fromarray(data, 'RGBA')
    result.save(output_path)
    print(f"✓ Saved: {output_path}")

if __name__ == '__main__':
    base_dir = r'D:\MATA KULIAH ONLINE\Project\cashmoneymanagement\frontend\public\asset\image'
    
    files = [
        'logo.png',
        'logo splash screen.png'
    ]
    
    for filename in files:
        input_path = os.path.join(base_dir, filename)
        output_path = os.path.join(base_dir, filename)  # Overwrite original
        
        if os.path.exists(input_path):
            print(f"Processing: {filename}")
            try:
                remove_background_smart(input_path, output_path)
            except Exception as e:
                print(f"✗ Error with smart method: {e}, trying simple method...")
                try:
                    remove_background_simple(input_path, output_path)
                except Exception as e2:
                    print(f"✗ Failed: {e2}")
        else:
            print(f"✗ File not found: {input_path}")
    
    print("\nDone!")
