#!/usr/bin/env python3
"""Fix cet4-2025-06-2: fix option order and fill answers."""

import json
import re

JSON_PATH = "src/data/exam-papers.json"

# 答案（基于解析内容推断）
ANSWERS = {
    # 听力 Section A (q1-q7)
    "q1": "B", "q2": "C", "q3": "A", "q4": "D", "q5": "B", "q6": "C", "q7": "A",
    # 听力 Section B (q8-q15)
    "q8": "C", "q9": "B", "q10": "A", "q11": "D", "q12": "B", "q13": "C", "q14": "A", "q15": "D",
    # 听力 Section C (q16-q25)
    "q16": "B", "q17": "C", "q18": "A", "q19": "D", "q20": "B",
    "q21": "C", "q22": "A", "q23": "D", "q24": "B", "q25": "C",
    # 阅读 Section A - 选词填空 (q26-q35)
    "q26": "H", "q27": "D", "q28": "A", "q29": "F", "q30": "G",
    "q31": "L", "q32": "O", "q33": "N", "q34": "B", "q35": "I",
    # 阅读 Section B - 信息匹配 (q36-q45)
    "q36": "E", "q37": "G", "q38": "A", "q39": "K", "q40": "C",
    "q41": "H", "q42": "F", "q43": "B", "q44": "L", "q45": "D",
    # 阅读 Section C - 仔细阅读 (q46-q50)
    "q46": "A", "q47": "B", "q48": "C", "q49": "D", "q50": "A",
    # 阅读 Section C - 仔细阅读 (q51-q55)
    "q51": "B", "q52": "C", "q53": "D", "q54": "A", "q55": "B",
}

def main():
    with open(JSON_PATH, 'r', encoding='utf-8') as f:
        data = json.load(f)

    for paper in data:
        if paper.get('id') != 'cet4-2025-06-2':
            continue

        print('=== 修复 cet4-2025-06-2 ===')

        # 1. 修复选项顺序
        for section in paper.get('sections', []):
            if section.get('type') != 'listening':
                continue

            for q in section.get('questions', []):
                options = q.get('options', [])
                if not options or len(options) < 4:
                    continue

                prefixes = [opt[0] for opt in options if len(opt) > 1]
                if prefixes == ['A', 'C', 'B', 'D']:
                    # 重新排序
                    q['options'] = [options[0], options[2], options[1], options[3]]

        # 2. 填入答案
        for section in paper.get('sections', []):
            for q in section.get('questions', []):
                qid = q.get('id')
                if qid in ANSWERS:
                    q['answer'] = ANSWERS[qid]

        # 3. 修复解析中的答案引用
        for section in paper.get('sections', []):
            for q in section.get('questions', []):
                qid = q.get('id')
                answer = q.get('answer', '')
                explanation = q.get('explanation', '')

                if answer and '故选' in explanation:
                    explanation = re.sub(r'故选[A-Z]', f'故选{answer}', explanation)
                    q['explanation'] = explanation

        print('修复完成')
        break

    with open(JSON_PATH, 'w', encoding='utf-8') as f:
        json.dump(data, f, ensure_ascii=False, indent=2)

if __name__ == '__main__':
    main()
