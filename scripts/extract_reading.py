#!/usr/bin/env python3
"""从 Word 文档中提取阅读理解题目，生成 JSON 数据"""

import os
import re
import json
from docx import Document

def extract_section_c(text):
    """提取阅读理解 Section C 的内容"""
    # 找到 Reading Comprehension 部分
    reading_match = re.search(r'Part\s+[ⅢIII]+\s+Reading', text)
    if not reading_match:
        return None

    reading_section = text[reading_match.start():]

    # 找到 Section C
    section_c_match = re.search(r'Section\s+C', reading_section)
    if not section_c_match:
        return None

    section_c = reading_section[section_c_match.start():]

    # 找到翻译部分（Part IV）作为结束
    translation_match = re.search(r'Part\s+[ⅣIV]+\s+Trans', section_c)
    if translation_match:
        section_c = section_c[:translation_match.start()]

    return section_c


def parse_passages(section_c_text):
    """解析文章和题目"""
    passages = []

    # 按 Passage 分割
    passage_splits = re.split(r'Passage\s+(?:One|Two|Three)', section_c_text)

    for i, split in enumerate(passage_splits[1:], 1):  # 跳过第一个空分割
        passage_data = {"passage": "", "questions": []}

        # 提取题目编号范围
        question_range_match = re.search(r'Questions?\s+(\d+)\s+to\s+(\d+)', split)
        if not question_range_match:
            continue

        q_start = int(question_range_match.group(1))
        q_end = int(question_range_match.group(2))

        # 提取文章正文（从 "Questions X to Y" 之后到第一题之间）
        passage_start = question_range_match.end()
        first_question_match = re.search(rf'{q_start}\s*[\.、]\s*A\)', split[passage_start:])
        if first_question_match:
            passage_text = split[passage_start:passage_start + first_question_match.start()]
            # 清理页码标记
            passage_text = re.sub(r'试题册\s*·.*?\d+', '', passage_text)
            passage_text = re.sub(r'\d+\s*$', '', passage_text)
            passage_data["passage"] = passage_text.strip()

        # 提取每道题
        for q_num in range(q_start, q_end + 1):
            question = extract_question(split, q_num)
            if question:
                passage_data["questions"].append(question)

        if passage_data["questions"]:
            passages.append(passage_data)

    return passages


def extract_question(text, q_num):
    """提取单道题目"""
    # 找到题目
    q_pattern = rf'{q_num}\s*[\.、]\s*(.*?)(?={q_num+1}\s*[\.、]\s*A\)|$)'
    q_match = re.search(q_pattern, text, re.DOTALL)
    if not q_match:
        # 尝试另一种模式
        q_pattern = rf'(?<!\d){q_num}\s*[\.、]\s*(.*?)(?:(?={q_num+1}\s*[\.、])|$)'
        q_match = re.search(q_pattern, text, re.DOTALL)
        if not q_match:
            return None

    q_text = q_match.group(1).strip()

    # 提取选项
    options = []
    option_pattern = r'([A-D])\)\s*(.*?)(?=[A-D]\)|$)'
    option_matches = re.findall(option_pattern, q_text, re.DOTALL)

    for letter, content in option_matches:
        options.append(f"{letter}){content.strip()}")

    # 提取题目文本（选项之前）
    first_option = re.search(r'A\)', q_text)
    question_text = q_text[:first_option.start()].strip() if first_option else q_text

    # 清理题目文本
    question_text = re.sub(r'\s+', ' ', question_text)

    if not options or len(options) < 4:
        return None

    return {
        "id": f"q{q_num}",
        "content": question_text,
        "options": options[:4],
        "answer": "",  # 需要从答案文件中获取
        "explanation": ""
    }


def process_docx(doc_path):
    """处理单个 Word 文档"""
    doc = Document(doc_path)
    text = "\n".join([p.text for p in doc.paragraphs])

    section_c = extract_section_c(text)
    if not section_c:
        return None

    passages = parse_passages(section_c)
    return passages


def main():
    base_dir = "/home/yqx/project/English/CET/cet-prep/public"

    # 处理 CET-6 Word 文档
    cet6_dir = os.path.join(base_dir, "CET6")
    all_papers = []

    for year_dir in sorted(os.listdir(cet6_dir)):
        if not os.path.isdir(os.path.join(cet6_dir, year_dir)):
            continue

        word_dir = None
        for subdir in os.listdir(os.path.join(cet6_dir, year_dir)):
            if "word" in subdir.lower() or "真题word" in subdir:
                word_dir = os.path.join(cet6_dir, year_dir, subdir)
                break

        if not word_dir:
            continue

        for doc_file in sorted(os.listdir(word_dir)):
            if not doc_file.endswith('.docx'):
                continue

            doc_path = os.path.join(word_dir, doc_file)
            print(f"Processing: {doc_file}")

            try:
                passages = process_docx(doc_path)
                if passages:
                    # 解析年份和套号
                    year_match = re.search(r'(\d{4})', year_dir)
                    year = int(year_match.group(1)) if year_match else 0

                    # 解析月份
                    month_match = re.search(r'(\d{2})月', year_dir)
                    month = int(month_match.group(1)) if month_match else 0

                    # 解析套号
                    session_match = re.search(r'第(\d)套', doc_file)
                    session = int(session_match.group(1)) if session_match else None

                    paper = {
                        "id": f"cet6-{year}-{month:02d}" + (f"-{session}" if session else ""),
                        "exam_type": "cet6",
                        "year": year,
                        "month": month,
                        "session": session,
                        "title": f"{year}年{month}月 六级阅读" + (f" 第{session}套" if session else ""),
                        "passages": passages
                    }
                    all_papers.append(paper)
                    print(f"  -> Extracted {sum(len(p['questions']) for p in passages)} questions")
            except Exception as e:
                print(f"  -> Error: {e}")

    # 保存结果
    output_path = os.path.join(base_dir, "..", "src", "data", "cet6-reading.json")
    os.makedirs(os.path.dirname(output_path), exist_ok=True)

    with open(output_path, 'w', encoding='utf-8') as f:
        json.dump(all_papers, f, ensure_ascii=False, indent=2)

    print(f"\nTotal: {len(all_papers)} papers extracted")
    print(f"Saved to: {output_path}")


if __name__ == "__main__":
    main()
