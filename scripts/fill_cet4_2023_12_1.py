#!/usr/bin/env python3
"""Fill answers for cet4-2023-12-1 from raw text analysis."""

import json
import re

JSON_PATH = "src/data/exam-papers.json"

# 从解析中提取的完整答案
ANSWERS = {
    # 听力 Section A - News Report (q1-q7)
    "q1": "A", "q2": "A", "q3": "A", "q4": "C", "q5": "C", "q6": "D", "q7": "C",
    # 听力 Section A - 长对话 (q8-q14)
    "q8": "D", "q9": "C", "q10": "C", "q11": "C", "q12": "C", "q13": "C", "q14": "A",
    # 听力 Section B - 长对话 (q15-q25)
    "q15": "C", "q16": "D", "q17": "B", "q18": "A", "q19": "C", "q20": "B",
    "q21": "B", "q22": "A", "q23": "D", "q24": "B", "q25": "D",
    # 阅读 Section A (q26-q35)
    "q26": "F", "q27": "D", "q28": "H", "q29": "I", "q30": "O",
    "q31": "M", "q32": "L", "q33": "J", "q34": "A", "q35": "G",
    # 阅读 Section B (q36-q45)
    "q36": "D", "q37": "I", "q38": "B", "q39": "G", "q40": "A",
    "q41": "F", "q42": "L", "q43": "J", "q44": "H", "q45": "K",
    # 阅读 Section C (q46-q55)
    "q46": "A", "q47": "B", "q48": "D", "q49": "C", "q50": "B",
    "q51": "A", "q52": "D", "q53": "C", "q54": "C", "q55": "A",
}

def main():
    with open(JSON_PATH, 'r', encoding='utf-8') as f:
        data = json.load(f)

    for paper in data:
        if paper.get('id') != 'cet4-2023-12-1':
            continue

        filled = 0
        for section in paper.get('sections', []):
            for q in section.get('questions', []):
                qid = q.get('id')
                if qid in ANSWERS and not q.get('answer'):
                    q['answer'] = ANSWERS[qid]
                    filled += 1

        print(f"Filled {filled} answers for cet4-2023-12-1")
        break

    with open(JSON_PATH, 'w', encoding='utf-8') as f:
        json.dump(data, f, ensure_ascii=False, indent=2)

if __name__ == '__main__':
    main()
