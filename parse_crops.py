#!/usr/bin/env python3
"""
Parse OCR from cropped question images and generate quiz data.
Uses the Swift OCR tool for better accuracy.
"""
import os
import re
import json
import subprocess

CROPS_DIR = "/Users/dudubn/Documents/New project 2/public/test-cards/crops"
OCR_BIN = "/Users/dudubn/Documents/New project 2/ocr"

# Common OCR corrections for Mongolian driving test
CORRECTIONS = {
    'зевшеерех': 'зөвшөөрөх',
    'зевшеерне': 'зөвшөөрнө',
    'зевхон': 'зөвхөн',
    'зевхен': 'зөвхөн',
    'зевшен': 'зөвшөөн',
    'зовшеерне': 'зөвшөөрнө',
    'зовшеерех': 'зөвшөөрөх',
    'зовшеорех': 'зөвшөөрөх',
    'зовшеорно': 'зөвшөөрнө',
    'зовшоерно': 'зөвшөөрнө',
    'зовшоерех': 'зөвшөөрөх',
    'зра ': 'Зураг ',
    'зраг': 'Зураг',
    'зурагт': 'Зурагт',
    'уед': 'үед',
    'уеийн': 'үеийн',
    'огех': 'өгөх',
    'бух': 'бүх',
    ' ва ': ' вэ ',
    'гуй': 'гүй',
    'дед': 'дэд',
    'емно': 'өмнө',
    'омне': 'өмнө',
    'оролгуйгээр': 'оролгүйгээр',
    'оролгуй': 'оролгүй',
    'хеделгеен': 'хөдөлгөөн',
    'хеделгеений': 'хөдөлгөөний',
    'хеделгеэ': 'хөдөлгөөн',
    'хасчийн': 'хэсгийн',
    'хасчий': 'хэсгий',
    'хостийн': 'хэсгийн',
    'хостий': 'хэсгий',
    'хурээлэн': 'хүрээлэн',
    'хуний': 'хүний',
    'хуухдий': 'хүүхдий',
    'хуухэд': 'хүүхэд',
    'ходелгеен': 'хөдөлгөөн',
    'ходелгеений': 'хөдөлгөөний',
    'ходелгоен': 'хөдөлгөөн',
    'ходелгоений': 'хөдөлгөөний',
    'халтиргаатай': 'халтиргаатай',
    'халтиргаа': 'халтиргаа',
    'халтиргаатай': 'халтиргаатай',
    'тээврийн': 'тээврийн',
    'тээвэрлэх': 'тээвэрлэх',
    'тэмдгийн': 'тэмдгийн',
    'тэмдэглэлийн': 'тэмдэглэлийн',
    ' бол ': ' бол ',
    ' буюу ': ' буюу ',
    ' ба ': ' ба ',
    ' болон ': ' болон ',
    ' хүртэл ': ' хүртэл ',
    ' тул ': ' тул ',
    ' учир ': ' учир ',
    ' улмаас ': ' улмаас ',
    ' тохиолдолд ': ' тохиолдолд ',
    ' дээр ': ' дээр ',
    ' доор ': ' доор ',
    ' дунд ': ' дунд ',
    ' гадна ': ' гадна ',
    ' дотроо ': ' дотроо ',
    ' руу ': ' руу ',
    ' рүү ': ' рүү ',
    ' ас ': ' ас ',
    ' талд ': ' талд ',
    ' дээрх ': ' дээрх ',
    ' ийн ': ' ийн ',
    ' ын ': ' ын ',
    ' ийг ': ' ийг ',
    ' ыг ': ' ыг ',
    ' д ': ' д ',
    ' т ': ' т ',
    ' н ': ' н ',
}

def correct_text(text):
    for wrong, right in CORRECTIONS.items():
        text = text.replace(wrong, right)
    return text

def parse_q_text(raw_text):
    """Parse raw OCR text from a question crop into structured format."""
    text = raw_text.strip()
    
    # Remove common noise
    text = re.sub(r'^Image loaded:.*', '', text, flags=re.MULTILINE)
    text = re.sub(r'^\d+$', '', text)
    text = re.sub(r'^[А-Яа-яЁёӨөҮү\s]+$', '', text)  # Russian header noise
    
    text = correct_text(text)
    
    lines = [l.strip() for l in text.split('\n') if l.strip()]
    
    if not lines:
        return None
    
    # Try to identify question and options
    question = []
    options = []
    current_option = None
    option_lines = []
    
    for line in lines:
        # Check for numbered option (1. 2. 3. 4.)
        m = re.match(r'^(\d+)\.\s+(.*)', line)
        if m:
            if current_option:
                options.append((current_option, ' '.join(option_lines)))
            current_option = m.group(1)
            option_lines = [m.group(2)]
            continue
        
        # Check for letter option (А. Б. В. Г. Д.)
        m = re.match(r'^([А-ДA-E])\.\s+(.*)', line)
        if m:
            if current_option:
                options.append((current_option, ' '.join(option_lines)))
            current_option = m.group(1)
            option_lines = [m.group(2)]
            continue
        
        # Continuation of option or question
        if current_option:
            option_lines.append(line)
        else:
            question.append(line)
    
    if current_option:
        options.append((current_option, ' '.join(option_lines)))
    
    q_text = ' '.join(question).strip()
    opt_texts = [opt[1] for opt in options]
    
    if not q_text:
        return None
    
    return {
        'question': q_text,
        'options': opt_texts
    }

def main():
    all_cards = {}
    
    # Process all card halves
    for card_num in range(10, 41):
        for suffix in ['a', 'b']:
            card_id = f"card-{card_num:02d}"
            if card_id not in all_cards:
                all_cards[card_id] = []
            
            q_offset = 0 if suffix == 'a' else 10
            illustration = f"/public/test-cards/{card_num:02d}{suffix}.jpg"
            
            for q_idx in range(10):
                q_num = q_idx + 1
                crop_file = os.path.join(CROPS_DIR, f"{card_num:02d}{suffix}_q{q_num:02d}.jpg")
                
                if not os.path.exists(crop_file):
                    continue
                
                # Run OCR on crop
                try:
                    result = subprocess.run(
                        [OCR_BIN, crop_file],
                        capture_output=True, text=True, timeout=10
                    )
                    raw = result.stdout.strip()
                except:
                    raw = ''
                
                # Parse the OCR text
                parsed = parse_q_text(raw)
                
                if parsed and parsed['question']:
                    quiz_id = f"{card_num:02d}.{q_offset + q_num}"
                    
                    # Ensure we have at least 2 options
                    opts = parsed['options']
                    if len(opts) < 2:
                        opts = ['А', 'Б', 'В', 'Г', 'Д', 'Е']
                    
                    all_cards[card_id].append({
                        'id': quiz_id,
                        'question': parsed['question'],
                        'options': opts[:6],  # Max 6 options
                        'answer': 0,  # Default to first option (needs review)
                        'answerText': opts[0] if opts else 'А',
                        'illustration': illustration,
                        'imagePosition': 'top'
                    })
    
    # Generate output
    groups = []
    quizzes = {}
    
    for card_num in range(10, 41):
        card_id = f"card-{card_num:02d}"
        if card_id in all_cards and all_cards[card_id]:
            quizzes[card_id] = all_cards[card_id]
            groups.append({
                'id': card_id,
                'title': f"Карт #{card_num:02d}",
                'description': f"Замын хөдөлгөөний дүрмийн тест - Карт #{card_num:02d}. Асуултын зураг дээрх асуулт хариултыг сонгоно уу.",
                'quizCount': len(all_cards[card_id]),
                'available': True
            })
    
    print(f"Total cards: {len(groups)}")
    total = sum(len(v) for v in quizzes.values())
    print(f"Total questions: {total}")
    
    # Save JSON for review
    output_file = os.path.join(CROPS_DIR, '..', 'parsed_crops.json')
    with open(output_file, 'w', encoding='utf-8') as f:
        json.dump({'groups': groups, 'quizzes': quizzes}, f, ensure_ascii=False, indent=2)
    print(f"Saved to {output_file}")
    
    # Print samples
    for card_id in list(quizzes.keys())[:2]:
        qs = quizzes[card_id]
        print(f"\n{card_id}: {len(qs)} questions")
        for q in qs[:2]:
            print(f"  {q['id']}: {q['question'][:60]}...")
            for i, opt in enumerate(q['options'][:4]):
                print(f"    {i+1}. {opt[:40]}")

if __name__ == '__main__':
    main()
