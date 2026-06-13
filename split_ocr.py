#!/usr/bin/env python3
"""
Better OCR using Apple Vision (via compiled Swift OCR tool).
Split card image into individual question regions and OCR each.
"""
import os
import json
import subprocess
from PIL import Image

CARD_DIR = "/Users/dudubn/Documents/New project 2/public/test-cards"
OUTPUT_DIR = "/Users/dudubn/Documents/New project 2/public/test-cards/crops"
OCR_BIN = "/Users/dudubn/Documents/New project 2/ocr"
os.makedirs(OUTPUT_DIR, exist_ok=True)

def split_and_ocr_card(card_num, suffix):
    """Split a card image into 10 question regions and OCR each."""
    card_filename = f"{card_num:02d}{suffix}.jpg"
    card_path = os.path.join(CARD_DIR, card_filename)
    
    if not os.path.exists(card_path):
        print(f"Error: {card_path} not found")
        return []
    
    img = Image.open(card_path)
    width, height = img.size
    print(f"  Image: {width}x{height}")
    
    # Question regions: skip header and footer
    header_pct = 0.06
    footer_pct = 0.04
    q_area_start = int(height * header_pct)
    q_area_end = int(height * (1 - footer_pct))
    q_height = (q_area_end - q_area_start) // 10
    
    questions = []
    
    for q_idx in range(10):
        y_start = q_area_start + (q_idx * q_height)
        y_end = y_start + q_height
        
        crop = img.crop((0, y_start, width, y_end))
        crop_path = os.path.join(OUTPUT_DIR, f"{card_num:02d}{suffix}_q{q_idx+1:02d}.jpg")
        crop.save(crop_path)
        
        # Run Swift OCR
        try:
            result = subprocess.run([OCR_BIN, crop_path], capture_output=True, text=True, timeout=15)
            ocr_text = result.stdout.strip()
            # Remove "Image loaded:" line
            ocr_text = '\n'.join(line for line in ocr_text.split('\n') if not line.startswith('Image loaded:'))
            ocr_text = ocr_text.strip()
            
            if ocr_text:
                questions.append({
                    'q_num': q_idx + 1,
                    'text': ocr_text
                })
                print(f"  Q{q_idx+1}: {ocr_text[:100]}")
            else:
                print(f"  Q{q_idx+1}: (empty)")
        except Exception as e:
            print(f"  Q{q_idx+1}: Error - {e}")
    
    return questions

if __name__ == '__main__':
    import sys
    card_num = int(sys.argv[1]) if len(sys.argv) > 1 else 10
    suffix = sys.argv[2] if len(sys.argv) > 2 else 'a'
    
    print(f"Processing card {card_num:02d}{suffix}...")
    questions = split_and_ocr_card(card_num, suffix)
    
    # Save results
    result_file = os.path.join(OUTPUT_DIR, f"{card_num:02d}{suffix}_questions.json")
    with open(result_file, 'w', encoding='utf-8') as f:
        json.dump(questions, f, ensure_ascii=False, indent=2)
    
    print(f"\nSaved {len(questions)} questions to {result_file}")
