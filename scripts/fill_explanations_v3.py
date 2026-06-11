#!/usr/bin/env python3
"""Extract explanations from 2025.6 第一套解析.md and fill into exam-papers.json."""

import json
import re

JSON_PATH = "src/data/exam-papers.json"
MD_PATH = "public/2025年6月四级真题原卷（全3套）/2025.6四级第一套解析.md"

def extract_explanations(md_content):
    """Extract all question explanations."""
    explanations = {}

    # 找到所有"答案详解"部分
    sections = re.split(r'答案详解[·•]?\s*', md_content)

    for section in sections[1:]:  # 跳过第一个部分（在第一个答案详解之前）
        # 提取每道题的解析
        # 模式：题号. 题目内容...解析\n解析内容
        lines = section.split('\n')
        current_q = None
        current_explanation = []

        for line in lines:
            line = line.strip()
            if not line:
                continue

            # 检查是否是新题目
            q_match = re.match(r'^(\d+)[.\s]', line)
            if q_match:
                # 保存之前的题目解析
                if current_q and current_explanation:
                    explanation_text = ' '.join(current_explanation)
                    # 清理多余空格
                    explanation_text = re.sub(r'\s+', ' ', explanation_text).strip()
                    # 截取前150字符
                    if len(explanation_text) > 150:
                        explanation_text = explanation_text[:150] + "..."
                    explanations[f'q{current_q}'] = explanation_text

                # 开始新题目
                current_q = int(q_match.group(1))
                current_explanation = []
            elif current_q:
                # 收集解析内容
                if line.startswith('解析') or line.startswith('解') or line.startswith('答案'):
                    continue
                if line.startswith('A)') or line.startswith('B)') or line.startswith('C)') or line.startswith('D)'):
                    continue
                if '正确答案' in line or '故选' in line or '故答案' in line:
                    current_explanation.append(line)

        # 保存最后一道题的解析
        if current_q and current_explanation:
            explanation_text = ' '.join(current_explanation)
            explanation_text = re.sub(r'\s+', ' ', explanation_text).strip()
            if len(explanation_text) > 150:
                explanation_text = explanation_text[:150] + "..."
            explanations[f'q{current_q}'] = explanation_text

    return explanations

def main():
    # 读取解析文件
    with open(MD_PATH, 'r', encoding='utf-8') as f:
        md_content = f.read()

    # 提取解析
    explanations = extract_explanations(md_content)
    print(f"Extracted {len(explanations)} explanations")

    # 显示部分解析
    for qid in sorted(explanations.keys(), key=lambda x: int(x[1:]))[:5]:
        print(f"  {qid}: {explanations[qid][:50]}...")

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
