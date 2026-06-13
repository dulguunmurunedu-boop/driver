#!/usr/bin/env python3
"""
Parse OCR text files and generate card-quizzes.js with real quiz data.
"""
import os
import re
import json

OCR_DIR = "/Users/dudubn/Documents/New project 2/public/test-cards"
CROPS_DIR = os.path.join(OCR_DIR, "crops")

def parse_ocr_file(filepath):
    """Parse an OCR text file and extract questions."""
    with open(filepath, 'r', encoding='utf-8') as f:
        lines = f.readlines()
    text = ''.join(lines)
    text = re.sub(r'^Image loaded:.*?\n', '', text, flags=re.MULTILINE)
    text = re.sub(r'^Еренхий тест\n', '', text, flags=re.MULTILINE)
    text = re.sub(r'^RCV - \d+\n', '', text, flags=re.MULTILINE)
    text = re.sub(r'^©.*?\n', '', text, flags=re.MULTILINE)
    return text.strip()

def correct_ocr_text(text):
    """Fix common OCR errors for Mongolian text."""
    corrections = {
        'зевшеерех': 'зөвшөөрөх',
        'зевшеерне': 'зөвшөөрнө',
        'зевхон': 'зөвхөн',
        'зевхен': 'зөвхөн',
        'зра': 'Зураг',
        'зурагт': 'Зурагт',
        'уед': 'үед',
        'огех': 'өгөх',
        'бух': 'бүх',
        'ва': 'вэ',
        'гуй': 'гүй',
        'дед': 'дэд',
        'емно': 'өмнө',
        'оролгуйгээр': 'оролгүйгээр',
        'хеделгеен': 'хөдөлгөөн',
        'хеделгеений': 'хөдөлгөөний',
        'хасчийн': 'хэсгийн',
        'хостийн': 'хэсгийн',
        'хурээлэн': 'хүрээлэн',
        'хуний': 'хүний',
        'хуухдий': 'хүүхдий',
    }
    for wrong, right in corrections.items():
        text = text.replace(wrong, right)
    return text

def extract_questions(text):
    """Parse OCR text into structured question format."""
    lines = text.strip().split('\n')
    questions = []
    current_q = None
    current_options = []
    
    # Pattern: number at start of line
    num_pattern = re.compile(r'^(\d+)\s+(.*)')
    # Pattern: number. text (option)
    opt_pattern = re.compile(r'^(\.\d+|\d+\.)\s+(.*)')
    # Pattern: A. B. C. D. E.
    abc_pattern = re.compile(r'^([A-E])\.\s+(.*)')
    
    for line in lines:
        line = line.strip()
        if not line:
            continue
        
        # Try option pattern (1. 2. 3. 4.)
        m = opt_pattern.match(line)
        if m:
            opt_text = m.group(1).rstrip('.')
            opt_content = m.group(2).strip()
            current_options.append((opt_text, opt_content))
            continue
        
        # Try A. B. C. D. E. pattern
        m = abc_pattern.match(line)
        if m:
            current_options.append((m.group(1), m.group(2).strip()))
            continue
        
        # Try question number pattern
        m = num_pattern.match(line)
        if m and len(m.group(1)) <= 2:
            # Save previous question
            if current_q and current_options:
                questions.append({
                    'question': current_q,
                    'options': current_options
                })
            current_q = m.group(2).strip()
            current_options = []
            continue
        
        # Continuation line
        if current_options:
            # Append to last option
            last_opt = current_options[-1]
            current_options[-1] = (last_opt[0], last_opt[1] + ' ' + line)
        elif current_q:
            current_q += ' ' + line
    
    # Save last question
    if current_q and current_options:
        questions.append({
            'question': current_q,
            'options': current_options
        })
    
    return questions

def generate_from_ocr():
    """Generate quiz data from OCR text files."""
    groups = []
    quizzes = {}
    
    for card_num in range(10, 41):
        card_id = f"card-{card_num:02d}"
        card_quizzes = []
        
        for suffix, q_offset in [('a', 0), ('b', 10)]:
            ocr_file = os.path.join(OCR_DIR, f"{card_num:02d}{suffix}.txt")
            
            if not os.path.exists(ocr_file):
                continue
            
            text = parse_ocr_file(ocr_file)
            extracted = extract_questions(text)
            
            for i, eq in enumerate(extracted):
                q_num = q_offset + i + 1
                q_id = f"{card_num:02d}.{q_num}"
                
                # Build options list
                options = []
                answer = 0
                answer_text = ''
                
                for opt_key, opt_val in eq['options']:
                    options.append(f"{opt_key}. {opt_val}")
                
                # Determine correct answer (default to A/1)
                if options:
                    answer = 0
                    answer_text = options[0]
                
                card_quizzes.append({
                    'id': q_id,
                    'question': eq['question'],
                    'options': options if len(options) >= 2 else ['A', 'B', 'C', 'D'],
                    'answer': answer,
                    'answerText': answer_text,
                    'illustration': f"/public/test-cards/{card_num:02d}{suffix}.jpg",
                    'imagePosition': 'top'
                })
        
        if card_quizzes:
            quizzes[card_id] = card_quizzes
            groups.append({
                'id': card_id,
                'title': f"Карт #{card_num:02d}",
                'description': f"Замын хөдөлгөөний дүрмийн тест - Карт #{card_num:02d}",
                'quizCount': len(card_quizzes),
                'available': True
            })
    
    return groups, quizzes

if __name__ == '__main__':
    groups, quizzes = generate_from_ocr()
    
    output = {
        '__comment': 'Auto-generated from OCR - needs manual review and answer correction',
        'groups': groups,
        'quizzes': {k: v for k, v in quizzes.items()}
    }
    
    output_file = os.path.join(os.path.dirname(OCR_DIR), 'parsed_quizzes.json')
    with open(output_file, 'w', encoding='utf-8') as f:
        json.dump(output, f, ensure_ascii=False, indent=2)
    
    print(f"Saved to {output_file}")
    print(f"Groups: {len(groups)}")
    total = sum(len(v) for v in quizzes.values())
    print(f"Total questions: {total}")
    
    # Print sample
    if groups:
        first_card = groups[0]['id']
        if first_card in quizzes:
            q = quizzes[first_card][0]
            print(f"\nSample Q from {first_card}:")
            print(f"  Q: {q['question'][:80]}")
            print(f"  Options: {len(q['options'])}")
