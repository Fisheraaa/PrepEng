#!/usr/bin/env python3
"""Fix all issues: option order, explanations, and structure."""

import json
import re

JSON_PATH = "src/data/exam-papers.json"

TARGETS = ['cet4-2025-06-1', 'cet4-2023-12-1', 'cet4-2022-06-1', 'cet6-2023-06-1']

def fix_option_order(options):
    """修复选项顺序：A,C,B,D -> A,B,C,D"""
    if not options or len(options) < 4:
        return options

    prefixes = [opt[0] for opt in options if len(opt) > 1]
    if prefixes == ['A', 'C', 'B', 'D']:
        # 重新排序：A, B, C, D
        # 原顺序：A, C, B, D -> 新顺序：A, B, C, D
        return [options[0], options[2], options[1], options[3]]

    return options

def remap_answer(answer, old_options, new_options):
    """根据选项重排重新映射答案"""
    if not old_options or not new_options or len(old_options) < 4:
        return answer

    old_prefixes = [opt[0] for opt in old_options if len(opt) > 1]
    if old_prefixes == ['A', 'C', 'B', 'D']:
        # 原 B -> 新 C, 原 C -> 新 B
        if answer == 'B':
            return 'C'
        elif answer == 'C':
            return 'B'

    return answer

def fix_explanation(explanation, correct_answer):
    """修复解析中的'故选X'"""
    if not explanation or '故选' not in explanation:
        return explanation

    def replace_match(match):
        return f'故选{correct_answer}'

    return re.sub(r'故选[A-D]', replace_match, explanation)

def main():
    with open(JSON_PATH, 'r', encoding='utf-8') as f:
        data = json.load(f)

    for paper in data:
        pid = paper.get('id')
        if pid not in TARGETS:
            continue

        print(f'=== 修复 {pid} ===')

        for section in paper.get('sections', []):
            if section.get('type') != 'listening':
                continue

            for q in section.get('questions', []):
                qid = q.get('id')
                old_options = q.get('options', [])
                old_answer = q.get('answer', '')

                # 修复选项顺序
                new_options = fix_option_order(old_options)

                if new_options != old_options:
                    # 重新映射答案
                    new_answer = remap_answer(old_answer, old_options, new_options)

                    # 修复解析
                    old_exp = q.get('explanation', '')
                    new_exp = fix_explanation(old_exp, new_answer)

                    q['options'] = new_options
                    q['answer'] = new_answer
                    q['explanation'] = new_exp

                    if old_answer != new_answer:
                        print(f'  {qid}: 答案 {old_answer} -> {new_answer}')

    with open(JSON_PATH, 'w', encoding='utf-8') as f:
        json.dump(data, f, ensure_ascii=False, indent=2)

    print('\n修复完成')

if __name__ == '__main__':
    main()
