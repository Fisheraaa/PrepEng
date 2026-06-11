#!/usr/bin/env python3
"""Extract explanations from 2025.6 第一套解析.md and fill into exam-papers.json."""

import json
import re

JSON_PATH = "src/data/exam-papers.json"
MD_PATH = "public/2025年6月四级真题原卷（全3套）/2025.6四级第一套解析.md"

def extract_listening_explanations(md_content):
    """Extract listening question explanations."""
    explanations = {}

    # 找到听力部分
    listening_match = re.search(r'Part II Listening Comprehension(.*?)(?=Part III|$)', md_content, re.DOTALL)
    if not listening_match:
        return explanations

    listening_text = listening_match.group(1)

    # 提取每道题的解析
    # 模式：题号. 题目内容...解析\n解析内容
    for i in range(1, 26):
        # 找到题目
        q_pattern = rf'({i})\..*?(?:解析|答案详解)'
        q_match = re.search(q_pattern, listening_text, re.DOTALL)
        if q_match:
            # 找到解析内容
            start_pos = q_match.end()
            # 找到下一题或章节结束
            next_q_pattern = rf'({i+1})\.(?:[A-Z]|[一-鿿])'
            next_q_match = re.search(next_q_pattern, listening_text[start_pos:])
            if next_q_match:
                explanation_text = listening_text[start_pos:start_pos + next_q_match.start()]
            else:
                explanation_text = listening_text[start_pos:start_pos + 500]

            # 清理文本
            explanation_text = re.sub(r'\s+', ' ', explanation_text).strip()
            # 截取前150字符
            if len(explanation_text) > 150:
                explanation_text = explanation_text[:150] + "..."
            explanations[f'q{i}'] = explanation_text

    return explanations

def extract_reading_explanations(md_content):
    """Extract reading question explanations."""
    explanations = {}

    # 找到阅读部分
    reading_match = re.search(r'Part III Reading Comprehension(.*?)(?=Part IV|$)', md_content, re.DOTALL)
    if not reading_match:
        return explanations

    reading_text = reading_match.group(1)

    # 提取每道题的解析
    for i in range(26, 56):
        # 找到题目和解析
        q_pattern = rf'({i})\..*?(?:解析|答案详解)'
        q_match = re.search(q_pattern, reading_text, re.DOTALL)
        if q_match:
            # 找到解析内容
            start_pos = q_match.end()
            # 找到下一题或章节结束
            next_q_pattern = rf'({i+1})\.(?:[A-Z]|[一-鿿])'
            next_q_match = re.search(next_q_pattern, reading_text[start_pos:])
            if next_q_match:
                explanation_text = reading_text[start_pos:start_pos + next_q_match.start()]
            else:
                explanation_text = reading_text[start_pos:start_pos + 500]

            # 清理文本
            explanation_text = re.sub(r'\s+', ' ', explanation_text).strip()
            # 截取前150字符
            if len(explanation_text) > 150:
                explanation_text = explanation_text[:150] + "..."
            explanations[f'q{i}'] = explanation_text

    return explanations

def main():
    # 读取解析文件
    with open(MD_PATH, 'r', encoding='utf-8') as f:
        md_content = f.read()

    # 提取解析
    listening_explanations = extract_listening_explanations(md_content)
    reading_explanations = extract_reading_explanations(md_content)

    all_explanations = {**listening_explanations, **reading_explanations}
    print(f"Extracted {len(all_explanations)} explanations")
    print(f"  Listening: {len(listening_explanations)}")
    print(f"  Reading: {len(reading_explanations)}")

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
                if qid in all_explanations and not q.get('explanation'):
                    q['explanation'] = all_explanations[qid]
                    filled += 1

        print(f"Filled {filled} explanations for cet4-2025-06-1")
        break

    # 保存
    with open(JSON_PATH, 'w', encoding='utf-8') as f:
        json.dump(data, f, ensure_ascii=False, indent=2)

if __name__ == '__main__':
    main()
