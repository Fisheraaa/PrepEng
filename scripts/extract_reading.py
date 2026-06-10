#!/usr/bin/env python3
"""从 Word 文档和 PDF 中提取阅读理解题目"""

import os
import re
import json
from docx import Document
import pdfplumber


def clean_text(text):
    """清理文本中的多余空白和换行"""
    # 合并被换行断开的单词（如 "enviro-\nnment" -> "environment"）
    text = re.sub(r'(\w)-\s*\n\s*(\w)', r'\1\2', text)
    # 将单个换行替换为空格（保持段落双换行）
    text = re.sub(r'(?<!\n)\n(?!\n)', ' ', text)
    # 清理多余空格
    text = re.sub(r' {2,}', ' ', text)
    # 清理页码标记（各种格式）
    text = re.sub(r'[•·]\s*\d{4}年.*?真题.*?·\s*\d+', '', text)
    text = re.sub(r'试题册\s*·.*?\d+', '', text)
    text = re.sub(r'\d{4}年\d{1,2}月.*?真题.*?第?\s*\d+\s*页.*?共\s*\d+\s*页', '', text)
    # 清理淘宝广告等无关文字
    text = re.sub(r'淘宝.*?$', '', text, flags=re.MULTILINE)
    # 清理末尾的页码残留
    text = re.sub(r'\s*\d+\s*页\s*共\s*\d+\s*页\s*$', '', text)
    text = re.sub(r'\s*\d+\s*$', '', text)
    return text.strip()


def extract_passages_from_text(section_c_text):
    """从 Section C 文本中提取文章和题目"""
    passages = []

    # 按 Passage 分割
    passage_splits = re.split(r'Passage\s+(One|Two|Three)', section_c_text)

    for i in range(1, len(passage_splits), 2):
        passage_label = passage_splits[i]  # "One", "Two", "Three"
        split = passage_splits[i + 1] if i + 1 < len(passage_splits) else ""

        passage_data = {"passage": "", "questions": []}

        # 提取题目编号范围
        q_range_match = re.search(r'Questions?\s+(\d+)\s+to\s+(\d+)', split)
        if not q_range_match:
            continue

        q_start = int(q_range_match.group(1))
        q_end = int(q_range_match.group(2))

        # 提取文章正文：从 "are based on the following passage." 之后到第一题之前
        passage_marker = re.search(r'are based on the following passage\.\s*', split)
        if passage_marker:
            after_marker = split[passage_marker.end():]
        else:
            after_marker = split[q_range_match.end():]

        # 找第一道题的题号
        first_q_pattern = rf'(?<!\d){q_start}\s*\.\s*[A-Z]'
        first_q_match = re.search(first_q_pattern, after_marker)

        if first_q_match:
            passage_text = after_marker[:first_q_match.start()]
            passage_data["passage"] = clean_text(passage_text)

        # 提取每道题
        for q_num in range(q_start, q_end + 1):
            question = extract_question(split, q_num, q_end)
            if question:
                passage_data["questions"].append(question)

        if passage_data["questions"]:
            passages.append(passage_data)

    return passages


def extract_question(text, q_num, q_end):
    """提取单道题目"""
    # 找到题目开始位置
    q_start_pattern = rf'(?<!\d){q_num}\s*\.\s*(?=[A-Z])'
    q_start_match = re.search(q_start_pattern, text)
    if not q_start_match:
        return None

    # 找到下一题开始位置
    if q_num < q_end:
        next_q_pattern = rf'(?<!\d){q_num + 1}\s*\.\s*(?=[A-Z])'
        next_q_match = re.search(next_q_pattern, text[q_start_match.end():])
        if next_q_match:
            q_text = text[q_start_match.start():q_start_match.end() + next_q_match.start()]
        else:
            q_text = text[q_start_match.start():q_start_match.start() + 800]
    else:
        q_text = text[q_start_match.start():q_start_match.start() + 800]

    # 提取选项（A) B) C) D) 格式）
    options = []
    option_pattern = r'([A-D])\s*[\)）\.]\s*(.*?)(?=[A-D]\s*[\)）\.]|$)'
    option_matches = re.findall(option_pattern, q_text, re.DOTALL)

    for letter, content in option_matches:
        clean_content = re.sub(r'\s+', ' ', content).strip()
        if clean_content:
            options.append(f"{letter}){clean_content}")

    # 提取题目文本（选项之前）
    first_option = re.search(r'A\s*[\)）\.]', q_text)
    question_text = q_text[:first_option.start()].strip() if first_option else q_text
    # 去掉题号
    question_text = re.sub(r'^\d+\s*\.\s*', '', question_text)
    question_text = re.sub(r'\s+', ' ', question_text).strip()

    if not options or len(options) < 4:
        return None

    return {
        "id": f"q{q_num}",
        "content": question_text,
        "options": options[:4],
        "answer": "",
        "explanation": ""
    }


def extract_from_docx(doc_path):
    """从 Word 文档提取阅读理解"""
    doc = Document(doc_path)
    text = "\n".join([p.text for p in doc.paragraphs])

    # 找 Part III Reading
    reading_match = re.search(r'Part\s+[ⅢIII]+\s+Reading', text)
    if not reading_match:
        reading_match = re.search(r'Part\s+in\s+Reading', text)
        if not reading_match:
            return None

    reading_section = text[reading_match.start():]

    # 找 Section C（阅读的，不是听力的）
    section_c_match = re.search(r'Section\s+C', reading_section)
    if not section_c_match:
        return None

    section_c = reading_section[section_c_match.start():]

    # 找 Part IV Translation 作为结束
    translation_match = re.search(r'Part\s+[ⅣIV]+\s+Trans', section_c)
    if translation_match:
        section_c = section_c[:translation_match.start()]

    return extract_passages_from_text(section_c)


def extract_from_pdf(pdf_path):
    """从 PDF 提取阅读理解"""
    with pdfplumber.open(pdf_path) as pdf:
        full_text = ""
        for page in pdf.pages:
            text = page.extract_text()
            if text:
                full_text += text + "\n"

    if not full_text.strip():
        return None

    # 找 Part III Reading Comprehension
    reading_start = re.search(r'Part\s*(?:[ⅢIII]+|in)\s*Reading\s*Comprehension', full_text, re.DOTALL)
    if not reading_start:
        reading_start = re.search(r'Reading\s+Comprehension\s*\(40', full_text)
        if not reading_start:
            return None

    reading_section = full_text[reading_start.start():]

    # 在阅读部分内找 Section C
    section_c_match = re.search(r'Section\s*C\s*\n', reading_section)
    if not section_c_match:
        return None

    section_c = reading_section[section_c_match.start():]

    # 找 Part IV 作为结束
    translation_match = re.search(r'Part\s*[ⅣIV]+.*?Trans', section_c, re.DOTALL)
    if translation_match:
        section_c = section_c[:translation_match.start()]

    return extract_passages_from_text(section_c)


def main():
    base_dir = "/home/yqx/project/English/CET/cet-prep/public"
    all_papers = []

    # === CET-6 Word 文档 ===
    cet6_dir = os.path.join(base_dir, "CET6")
    for year_dir in sorted(os.listdir(cet6_dir)):
        year_path = os.path.join(cet6_dir, year_dir)
        if not os.path.isdir(year_path):
            continue

        word_dir = None
        for subdir in os.listdir(year_path):
            if "word" in subdir.lower():
                word_dir = os.path.join(year_path, subdir)
                break

        if not word_dir:
            continue

        for doc_file in sorted(os.listdir(word_dir)):
            if not doc_file.endswith('.docx'):
                continue
            doc_path = os.path.join(word_dir, doc_file)
            print(f"[CET-6] {doc_file}")
            try:
                passages = extract_from_docx(doc_path)
                if passages:
                    year_match = re.search(r'(\d{4})', year_dir)
                    month_match = re.search(r'(\d{2})月', year_dir)
                    session_match = re.search(r'第(\d)套', doc_file)
                    year = int(year_match.group(1)) if year_match else 0
                    month = int(month_match.group(1)) if month_match else 0
                    session = int(session_match.group(1)) if session_match else None
                    q_count = sum(len(p['questions']) for p in passages)
                    paper = {
                        "id": f"cet6-{year}-{month:02d}" + (f"-{session}" if session else ""),
                        "exam_type": "cet6",
                        "year": year, "month": month, "session": session,
                        "title": f"{year}年{month}月 六级阅读" + (f" 第{session}套" if session else ""),
                        "passages": passages
                    }
                    all_papers.append(paper)
                    print(f"  -> {len(passages)} passages, {q_count} questions")
            except Exception as e:
                print(f"  -> Error: {e}")

    # === CET-4 PDF ===
    cet4_pdfs = [
        ("2022年06月四级真题+解析+听力音频全3套/2022.06英语四级真题PDF", "2022.06四级真题第1套", 2022, 6, 1),
        ("2023年6月CET4真题+解析+听力音频全3套/2023.6四级真题及解析", "2023.06英语四级真题第1套", 2023, 6, 1),
        ("2023年6月CET4真题+解析+听力音频全3套/2023.6四级真题及解析", "2023.06英语四级真题第2套", 2023, 6, 2),
        ("2023年6月CET4真题+解析+听力音频全3套/2023.6四级真题及解析", "2023.06英语四级真题第3套", 2023, 6, 3),
        ("2023年12月CET4真题+解析+听力音频全3套", "2023.12四级真题第1套", 2023, 12, 1),
        ("2023年12月CET4真题+解析+听力音频全3套", "2023.12四级真题第2套", 2023, 12, 2),
        ("2023年12月CET4真题+解析+听力音频全3套", "2023.12四级真题第3套", 2023, 12, 3),
        ("2025年6月四级真题原卷（全3套）", "2025.06四级真题第1套", 2025, 6, 1),
        ("2025年6月四级真题原卷（全3套）", "2025.06四级真题第2套", 2025, 6, 2),
        ("2025年6月四级真题原卷（全3套）", "2025.06四级真题第3套", 2025, 6, 3),
    ]

    for dir_path, filename, year, month, session in cet4_pdfs:
        full_path = os.path.join(base_dir, dir_path, filename + ".pdf")
        if not os.path.exists(full_path):
            dir_full = os.path.join(base_dir, dir_path)
            if os.path.isdir(dir_full):
                for f in os.listdir(dir_full):
                    if filename[:10] in f and f.endswith('.pdf') and "解析" not in f and "答案" not in f:
                        full_path = os.path.join(dir_full, f)
                        break
            if not os.path.exists(full_path):
                continue

        print(f"[CET-4] {os.path.basename(full_path)}")
        try:
            passages = extract_from_pdf(full_path)
            if passages:
                q_count = sum(len(p['questions']) for p in passages)
                paper = {
                    "id": f"cet4-{year}-{month:02d}-{session}",
                    "exam_type": "cet4",
                    "year": year, "month": month, "session": session,
                    "title": f"{year}年{month}月 四级阅读 第{session}套",
                    "passages": passages
                }
                all_papers.append(paper)
                print(f"  -> {len(passages)} passages, {q_count} questions")
        except Exception as e:
            print(f"  -> Error: {e}")

    # 保存
    output_path = os.path.join(base_dir, "..", "src", "data", "reading-papers.json")
    os.makedirs(os.path.dirname(output_path), exist_ok=True)
    with open(output_path, 'w', encoding='utf-8') as f:
        json.dump(all_papers, f, ensure_ascii=False, indent=2)

    print(f"\n=== Total: {len(all_papers)} papers ===")
    cet4_count = sum(1 for p in all_papers if p['exam_type'] == 'cet4')
    cet6_count = sum(1 for p in all_papers if p['exam_type'] == 'cet6')
    print(f"CET-4: {cet4_count}, CET-6: {cet6_count}")


if __name__ == "__main__":
    main()
