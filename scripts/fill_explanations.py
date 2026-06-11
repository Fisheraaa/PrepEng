#!/usr/bin/env python3
"""Extract explanations from 2025.6 第一套解析.md and fill into exam-papers.json."""

import json
import re

JSON_PATH = "src/data/exam-papers.json"
MD_PATH = "public/2025年6月四级真题原卷（全3套）/2025.6四级第一套解析.md"

def extract_explanations(md_content):
    """Extract question explanations from markdown."""
    explanations = {}

    # 匹配模式：题号. 题目内容...解析...答案
    # 听力部分：q1-q25
    for i in range(1, 26):
        # 找到题目和解析
        pattern = rf'{i}\..*?解析\s*(.*?)(?=\d+\.|Part|Section|$)'
        match = re.search(pattern, md_content, re.DOTALL)
        if match:
            explanation = match.group(1).strip()
            # 清理多余空格和换行
            explanation = re.sub(r'\s+', ' ', explanation)
            # 截取前200字符作为简洁解析
            if len(explanation) > 200:
                explanation = explanation[:200] + "..."
            explanations[f'q{i}'] = explanation

    return explanations

def main():
    # 读取解析文件
    with open(MD_PATH, 'r', encoding='utf-8') as f:
        md_content = f.read()

    # 提取解析
    explanations = extract_explanations(md_content)
    print(f"Extracted {len(explanations)} explanations")

    # 读取 exam-papers.json
    with open(JSON_PATH, 'r', encoding='utf-8') as f:
        data = json.load(f)

    # 填入解析
    for paper in data:
        if paper.get('id') != 'cet4-2025-06-1':
            continue

        filled = 0
        for section in paper.get('sections', []):
            for q in section.get('questions', []):
                qid = q.get('id')
                if qid in explanations and not q.get('explanation'):
                    q['explanation'] = explanations[qid]
                    filled += 1

        print(f"Filled {filled} explanations for cet4-2025-06-1")
        break

    # 保存
    with open(JSON_PATH, 'w', encoding='utf-8') as f:
        json.dump(data, f, ensure_ascii=False, indent=2)

if __name__ == '__main__':
    main()
