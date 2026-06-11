#!/usr/bin/env python3
"""Fix explanation references to match corrected answers."""

import json
import re

JSON_PATH = "src/data/exam-papers.json"

def fix_explanation(explanation, correct_answer):
    """修复解析中的'故选X'，使其与正确答案匹配"""
    if not explanation or '故选' not in explanation:
        return explanation

    # 找到"故选X"并替换
    def replace_match(match):
        return f'故选{correct_answer}'

    return re.sub(r'故选[A-D]', replace_match, explanation)

def main():
    with open(JSON_PATH, 'r', encoding='utf-8') as f:
        data = json.load(f)

    TARGETS = ['cet4-2025-06-1', 'cet4-2023-12-1', 'cet4-2022-06-1', 'cet6-2023-06-1']

    for paper in data:
        pid = paper.get('id')
        if pid not in TARGETS:
            continue

        print(f'=== 修复 {pid} 解析 ===')
        fixed_count = 0

        for section in paper.get('sections', []):
            if section.get('type') != 'listening':
                continue

            for q in section.get('questions', []):
                qid = q.get('id')
                answer = q.get('answer', '')
                old_exp = q.get('explanation', '')

                new_exp = fix_explanation(old_exp, answer)

                if new_exp != old_exp:
                    print(f'  {qid}: 解析已修复')
                    q['explanation'] = new_exp
                    fixed_count += 1

        print(f'  共修复 {fixed_count} 个解析\n')

    with open(JSON_PATH, 'w', encoding='utf-8') as f:
        json.dump(data, f, ensure_ascii=False, indent=2)

if __name__ == '__main__':
    main()
