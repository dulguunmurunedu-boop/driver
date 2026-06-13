#!/usr/bin/env python3
"""
Merge OCR-parsed quizzes with chapter quizzes into card-quizzes.js
"""
import re, json

OCR_FILE = '/Users/dudubn/Documents/New project 2/public/test-cards/parsed_crops.json'
SERVER_FILE = '/Users/dudubn/Documents/New project 2/server.js'
OUTPUT_FILE = '/Users/dudubn/Documents/New project 2/card-quizzes.js'

# Load OCR data
with open(OCR_FILE, 'r', encoding='utf-8') as f:
    ocr_data = json.load(f)

# Load server.js
with open(SERVER_FILE, 'r', encoding='utf-8') as f:
    server_content = f.read()

def esc(s):
    return str(s).replace('\\', '\\\\').replace('"', '\\"').replace('\n', ' ').replace('\r', '')

# Build quiz entries
all_groups = []
all_quizzes = {}

# Add OCR cards (card-10 to card-40)
for g in ocr_data['groups']:
    card_id = g['id']
    if card_id in ocr_data['quizzes']:
        all_groups.append(g)
        all_quizzes[card_id] = ocr_data['quizzes'][card_id]

# Add chapter cards (card-01 to card-07)
chapter_to_card = {
    'chapterOneQuizzes': ('card-01', 1),
    'chapterTwoQuizzes': ('card-02', 2),
    'chapterThirteenQuizzes': ('card-03', 3),
    'chapterSixteenQuizzes': ('card-04', 4),
    'chapterEighteenQuizzes': ('card-05', 5),
    'chapterNineteenQuizzes': ('card-06', 6),
    'chapterTwentyQuizzes': ('card-07', 7),
}

def extract_quiz_data(block):
    id_match = re.search(r'id:\s*"([^"]+)"', block)
    q_match = re.search(r'question:\s*"((?:[^"\\]|\\"|\\\\[^"])*)"', block)
    opt_match = re.search(r'options:\s*\[(.*?)\]', block, re.DOTALL)
    ans_match = re.search(r'answer:\s*(\d+)', block)
    ill_match = re.search(r'illustration:\s*"([^"]+)"', block)
    
    if not id_match or not q_match:
        return None
    
    q_id = id_match.group(1)
    question = q_match.group(1).replace('\\"', '"')
    
    options = []
    if opt_match:
        for m in re.finditer(r'"((?:[^"\\]|\\"|\\\\[^"])*)"', opt_match.group(1)):
            options.append(m.group(1).replace('\\"', '"'))
    
    answer = int(ans_match.group(1)) if ans_match else 0
    illustration = ill_match.group(1) if ill_match else ''
    answer_text = options[answer] if answer < len(options) else (options[0] if options else 'А')
    
    return {
        'id': q_id,
        'question': question,
        'options': options if options else ['А', 'Б', 'В', 'Г', 'Д', 'Е'],
        'answer': answer,
        'answerText': answer_text,
        'illustration': illustration,
        'imagePosition': 'top'
    }

for ch_name, (card_id, card_num) in chapter_to_card.items():
    pattern = rf'const {ch_name} = \[(.*?)\];'
    match = re.search(pattern, server_content, re.DOTALL)
    if not match:
        continue
    
    quiz_text = match.group(1)
    depth = 0
    start = None
    quizzes = []
    
    for i, char in enumerate(quiz_text):
        if char == '{':
            if depth == 0:
                start = i
            depth += 1
        elif char == '}':
            depth -= 1
            if depth == 0 and start is not None:
                block = quiz_text[start:i+1]
                q_data = extract_quiz_data(block)
                if q_data:
                    quizzes.append(q_data)
                start = None
    
    if quizzes:
        all_groups.append({
            'id': card_id,
            'title': f'Карт #{card_num:02d}',
            'description': f'Замын хөдөлгөөний дүрмийн тест - Карт #{card_num:02d}',
            'quizCount': len(quizzes),
            'available': True
        })
        all_quizzes[card_id] = quizzes

# Sort groups by card number
def card_sort_key(g):
    num = int(g['id'].split('-')[1])
    return (0, num) if num < 10 else (1, num)

all_groups.sort(key=card_sort_key)

# Generate JS file
lines = []
lines.append('// Auto-generated card quiz data - 40 cards from bilguuntulga.com')
lines.append('// Each card has 20 questions, 2 images (a=1-10, b=11-20)')
total_qs = sum(len(v) for v in all_quizzes.values())
lines.append(f'// Generated: {len(all_quizzes)} cards, {total_qs} questions total')
lines.append('// Cards 01-07: from chapter quizzes (with illustrations)')
lines.append('// Cards 10-40: from OCR (answers need manual review)')
lines.append('const cardQuizData = {')
lines.append('  groups: [')

for g in all_groups:
    lines.append(f'    {{ id: "{g["id"]}", title: "{esc(g["title"])}", description: "{esc(g["description"])}", quizCount: {g["quizCount"]}, available: true }},')

lines.append('  ],')
lines.append('  quizzes: {')

for g in all_groups:
    card_id = g['id']
    if card_id not in all_quizzes:
        continue
    qs = all_quizzes[card_id]
    lines.append(f'    "{card_id}": [')
    for q in qs:
        q_text = esc(q['question'])
        opts = [esc(o) for o in q['options']]
        opts_json = json.dumps(opts, ensure_ascii=False)
        answer_text = esc(q.get('answerText', 'А'))
        illustration = q.get('illustration', '')
        answer = q.get('answer', 0)
        lines.append(f'      {{ id: "{q["id"]}", question: "{q_text}", options: {opts_json}, answer: {answer}, answerText: "{answer_text}", illustration: "{illustration}", imagePosition: "top" }},')
    lines.append('    ],')

lines.append('  }')
lines.append('};')
lines.append('')
lines.append('module.exports = cardQuizData;')
lines.append('')

js_content = '\n'.join(lines)

with open(OUTPUT_FILE, 'w', encoding='utf-8') as f:
    f.write(js_content)

print(f"Written to {OUTPUT_FILE}")
print(f"Cards: {len(all_groups)}")
print(f"Total questions: {total_qs}")
print('')
print('Per card:')
for g in all_groups:
    card_id = g['id']
    n = len(all_quizzes.get(card_id, []))
    print(f'  {card_id}: {n} questions')
