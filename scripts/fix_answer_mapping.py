#!/usr/bin/env python3
"""Fix answer mapping for papers with A,C,B,D option order."""

import json

JSON_PATH = "src/data/exam-papers.json"

# 需要修复的卷子（选项顺序是 A,C,B,D）
PAPERS_TO_FIX = ['cet4-2025-06-1', 'cet4-2023-12-1', 'cet4-2022-06-1', 'cet6-2023-06-1']

# 答案映射：A,C,B,D -> A,B,C,D
def remap_answer(answer, options):
    """根据选项顺序重新映射答案"""
    if not options or len(options) < 4:
        return answer

    # 检查选项顺序
    prefixes = [opt[0] for opt in options if len(opt) > 1]

    if prefixes == ['A', 'C', 'B', 'D']:
        # 需要映射：原B->C, 原C->B
        if answer == 'B':
            return 'C'
        elif answer == 'C':
            return 'B'

    return answer

def remap_explanation(explanation, options):
    """修复解析中的答案引用"""
    if not options or len(options) < 4:
        return explanation

    prefixes = [opt[0] for opt in options if len(opt) > 1]

    if prefixes == ['A', 'C', 'B', 'D']:
        # 替换解析中的"故选X"
        import re
        def replace_match(match):
            letter = match.group(1)
            if letter == 'B':
                return '故选C'
            elif letter == 'C':
                return '故选B'
            return match.group(0)

        explanation = re.sub(r'故选([A-D])', replace_match, explanation)

    return explanation

def main():
    with open(JSON_PATH, 'r', encoding='utf-8') as f:
        data = json.load(f)

    for paper in data:
        pid = paper.get('id')
        if pid not in PAPERS_TO_FIX:
            continue

        print(f'=== 修复 {pid} ===')
        fixed_count = 0

        for section in paper.get('sections', []):
            if section.get('type') != 'listening':
                continue

            for q in section.get('questions', []):
                qid = q.get('id')
                old_answer = q.get('answer', '')
                options = q.get('options', [])

                new_answer = remap_answer(old_answer, options)
                new_explanation = remap_explanation(q.get('explanation', ''), options)

                if new_answer != old_answer:
                    print(f'  {qid}: {old_answer} -> {new_answer}')
                    q['answer'] = new_answer
                    fixed_count += 1

                if new_explanation != q.get('explanation', ''):
                    q['explanation'] = new_explanation

        print(f'  共修复 {fixed_count} 个答案\n')

    with open(JSON_PATH, 'w', encoding='utf-8') as f:
        json.dump(data, f, ensure_ascii=False, indent=2)

if __name__ == '__main__':
    main()
