#!/usr/bin/env python3
"""从 PDF/Word 提取完整真题（阅读全Section + 写作 + 翻译）"""

import os
import re
import json
import pdfplumber
from docx import Document


def clean_text(text):
    """清理文本"""
    # 合并断行单词
    text = re.sub(r'(\w)-\s*\n\s*(\w)', r'\1\2', text)
    # 单换行变空格
    text = re.sub(r'(?<!\n)\n(?!\n)', ' ', text)
    # 多空格
    text = re.sub(r' {2,}', ' ', text)
    # 各种页码/水印/广告
    text = re.sub(r'[•·]\s*\d{4}年.*?真题.*?[•·]\s*\d+', '', text)
    text = re.sub(r'试题册\s*·.*?\d+', '', text)
    text = re.sub(r'\d{4}年\d{1,2}月.*?真题.*?第?\s*\d+\s*页.*?共\s*\d+\s*页', '', text)
    text = re.sub(r'by\s*[:：]\s*\S+', '', text)
    text = re.sub(r'淘宝.*?$', '', text, flags=re.MULTILINE)
    text = re.sub(r'\s*\d+\s*页\s*共\s*\d+\s*页\s*$', '', text)
    text = re.sub(r'\s*\d+\s*$', '', text)
    return text.strip()


def get_pdf_text(pdf_path):
    """读取 PDF 全文"""
    with pdfplumber.open(pdf_path) as pdf:
        text = ""
        for page in pdf.pages:
            t = page.extract_text()
            if t:
                text += t + "\n"
    return text


def get_docx_text(doc_path):
    """读取 Word 全文"""
    doc = Document(doc_path)
    return "\n".join([p.text for p in doc.paragraphs])


def extract_reading_section_a(text):
    """提取 Section A 选词填空（从阅读部分）"""
    # 先找阅读部分（支持 "Part III" / "Part in" / "Part n" 等变体）
    reading_match = re.search(r'Part\s*(?:[ⅢIIIHIhiDl1]+|in|n)\s*Reading\s*Comprehension', text, re.DOTALL)
    if not reading_match:
        return None
    reading_text = text[reading_match.start():]

    # 在阅读部分内找 Section A 到 Section B
    match = re.search(r'Section\s*A\s*\n(.*?)(?=Section\s*B\s*\n)', reading_text, re.DOTALL)
    if not match:
        return None

    section_text = match.group(1)

    # 提取词库
    bank = []
    for m in re.finditer(r'([A-O])\)\s*(\w+)', section_text):
        bank.append(f"{m.group(1)}){m.group(2)}")

    if not bank:
        return None

    # 提取文章正文（从 Directions 之后到词库之前）
    directions_match = re.search(r'Directions:.*?once\.\s*', section_text, re.DOTALL)
    if not directions_match:
        return None

    after_directions = section_text[directions_match.end():]

    # 找词库开始位置
    bank_start = re.search(r'[A-O]\)\s*\w+', after_directions)
    if bank_start:
        passage_text = after_directions[:bank_start.start()]
    else:
        passage_text = after_directions

    # 创建填空题（题号 26-35）
    questions = []
    for q_num in range(26, 36):
        questions.append({
            "id": f"q{q_num}",
            "content": f"第 {q_num} 题：选择合适的词填入空白处",
            "options": bank,
            "answer": "",
            "explanation": ""
        })

    return {
        "type": "reading",
        "subtype": "banked_cloze",
        "title": "Section A — 选词填空",
        "passage": clean_text(passage_text),
        "bank": bank,
        "questions": questions
    }


def extract_reading_section_b(text):
    """提取 Section B 信息匹配（从阅读部分）"""
    # 先找阅读部分
    reading_match = re.search(r'Part\s*(?:[ⅢIIIHIhiDl1]+|in|n)\s*Reading\s*Comprehension', text, re.DOTALL)
    if not reading_match:
        return None
    reading_text = text[reading_match.start():]

    # 在阅读部分内找 Section B 到 Section C
    match = re.search(r'Section\s*B\s*\n(.*?)(?=Section\s*C\s*\n)', reading_text, re.DOTALL)
    if not match:
        return None

    section_text = match.group(1)

    # 提取匹配题（36-45）
    statements = []
    for q_num in range(36, 46):
        stmt_match = re.search(rf'{q_num}\.\s*(.*?)(?={q_num+1}\.\s|$)', section_text, re.DOTALL)
        if stmt_match:
            statements.append({
                "id": f"q{q_num}",
                "content": clean_text(stmt_match.group(1)),
                "answer": "",
                "explanation": ""
            })

    if not statements:
        return None

    return {
        "type": "reading",
        "subtype": "matching",
        "title": "Section B — 信息匹配",
        "passage": "",
        "questions": statements
    }


def extract_reading_section_c(text):
    """提取 Section C 仔细阅读（从阅读部分）"""
    # 先找阅读部分
    reading_match = re.search(r'Part\s*(?:[ⅢIIIHIhiDl1]+|in|n)\s*Reading\s*Comprehension', text, re.DOTALL)
    if not reading_match:
        return None
    reading_text = text[reading_match.start():]

    # 在阅读部分内找 Section C
    match = re.search(r'Section\s*C\s*\n(.*?)(?=Part\s*[ⅣIV])', reading_text, re.DOTALL)
    if not match:
        return None

    section_text = match.group(1)
    passages = []

    # 按 Passage 分割
    passage_splits = re.split(r'Passage\s+(One|Two)', section_text)

    for i in range(1, len(passage_splits), 2):
        split = passage_splits[i + 1] if i + 1 < len(passage_splits) else ""

        q_range_match = re.search(r'Questions?\s+(\d+)\s+to\s+(\d+)', split)
        if not q_range_match:
            continue

        q_start = int(q_range_match.group(1))
        q_end = int(q_range_match.group(2))

        # 文章正文
        passage_marker = re.search(r'are based on the following passage\.\s*', split)
        after_marker = split[passage_marker.end():] if passage_marker else split[q_range_match.end():]

        first_q_pattern = rf'(?<!\d){q_start}\s*\.\s*[A-Z]'
        first_q_match = re.search(first_q_pattern, after_marker)

        passage_text = ""
        if first_q_match:
            passage_text = clean_text(after_marker[:first_q_match.start()])

        # 题目
        questions = []
        for q_num in range(q_start, q_end + 1):
            q = extract_question(split, q_num, q_end)
            if q:
                questions.append(q)

        passages.append({
            "type": "reading",
            "subtype": "careful_reading",
            "title": f"Passage {i} — 仔细阅读",
            "passage": passage_text,
            "questions": questions
        })

    return passages


def extract_question(text, q_num, q_end):
    """提取单道选择题"""
    q_start_pattern = rf'(?<!\d){q_num}\s*\.\s*(?=[A-Z])'
    q_start_match = re.search(q_start_pattern, text)
    if not q_start_match:
        return None

    if q_num < q_end:
        next_q_pattern = rf'(?<!\d){q_num + 1}\s*\.\s*(?=[A-Z])'
        next_q_match = re.search(next_q_pattern, text[q_start_match.end():])
        q_text = text[q_start_match.start():q_start_match.end() + next_q_match.start()] if next_q_match else text[q_start_match.start():q_start_match.start() + 800]
    else:
        q_text = text[q_start_match.start():q_start_match.start() + 800]

    # 提取选项
    options = []
    for m in re.finditer(r'([A-D])\s*[\)）\.]\s*(.*?)(?=[A-D]\s*[\)）\.]|$)', q_text, re.DOTALL):
        content = re.sub(r'\s+', ' ', m.group(2)).strip()
        if content:
            options.append(f"{m.group(1)}){content}")

    # 题目文本
    first_opt = re.search(r'A\s*[\)）\.]', q_text)
    question_text = q_text[:first_opt.start()].strip() if first_opt else q_text
    question_text = re.sub(r'^\d+\s*\.\s*', '', question_text)
    question_text = re.sub(r'\s+', ' ', question_text).strip()

    if len(options) < 4:
        return None

    return {
        "id": f"q{q_num}",
        "content": question_text,
        "options": options[:4],
        "answer": "",
        "explanation": ""
    }


def extract_writing(text):
    """提取写作题目"""
    match = re.search(r'Part\s*I\s+Writing\s*\(.*?\)\s*\n\s*(.*?)(?=Part\s*II)', text, re.DOTALL)
    if not match:
        return None
    directions = clean_text(match.group(1))
    return {
        "type": "writing",
        "prompt": directions,
        "word_limit": 120
    }


def extract_listening(text):
    """提取听力题目"""
    # 找到 Listening 部分
    listen_match = re.search(r'Part\s*II\s*Listening.*?\n(.*?)(?=Part\s*(?:III|in)\s*Reading)', text, re.DOTALL)
    if not listen_match:
        return None

    listen_text = listen_match.group(1)

    # 提取所有听力选择题（1-25）
    questions = []
    for q_num in range(1, 26):
        q = extract_question(listen_text, q_num, 26)
        if q:
            questions.append(q)

    if not questions:
        return None

    return {
        "type": "listening",
        "title": "Part II — 听力理解",
        "questions": questions
    }


def extract_translation(text):
    """提取翻译题目"""
    match = re.search(r'Part\s*[ⅣIV]+\s+Translation\s*\(.*?\)\s*\n\s*(.*?)$', text, re.DOTALL)
    if not match:
        return None
    source = clean_text(match.group(1))
    return {
        "type": "translation",
        "source_text": source,
        "reference_translation": ""
    }


def process_file(filepath, exam_type, year, month, session):
    """处理单个文件，提取所有内容"""
    if filepath.endswith('.docx'):
        text = get_docx_text(filepath)
    elif filepath.endswith('.pdf'):
        text = get_pdf_text(filepath)
    else:
        return None

    if not text.strip():
        return None

    result = {
        "id": f"{exam_type}-{year}-{month:02d}" + (f"-{session}" if session else ""),
        "exam_type": exam_type,
        "year": year,
        "month": month,
        "session": session,
        "title": f"{year}年{month}月 {'四级' if exam_type == 'cet4' else '六级'}" + (f" 第{session}套" if session else ""),
        "sections": []
    }

    # 写作
    writing = extract_writing(text)
    if writing:
        result["sections"].append(writing)

    # 听力
    listening = extract_listening(text)
    if listening:
        result["sections"].append(listening)

    # 阅读 Section A
    section_a = extract_reading_section_a(text)
    if section_a:
        result["sections"].append(section_a)

    # 阅读 Section B
    section_b = extract_reading_section_b(text)
    if section_b:
        result["sections"].append(section_b)

    # 阅读 Section C
    section_c_list = extract_reading_section_c(text)
    if section_c_list:
        result["sections"].extend(section_c_list)

    # 翻译
    translation = extract_translation(text)
    if translation:
        result["sections"].append(translation)

    return result


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
            year_match = re.search(r'(\d{4})', year_dir)
            month_match = re.search(r'(\d{2})月', year_dir)
            session_match = re.search(r'第(\d)套', doc_file)
            year = int(year_match.group(1)) if year_match else 0
            month = int(month_match.group(1)) if month_match else 0
            session = int(session_match.group(1)) if session_match else None

            print(f"[CET-6] {doc_file}")
            try:
                result = process_file(doc_path, "cet6", year, month, session)
                if result and result["sections"]:
                    all_papers.append(result)
                    section_types = [s["type"] + "/" + s.get("subtype", "") for s in result["sections"]]
                    print(f"  -> {len(result['sections'])} sections: {', '.join(section_types)}")
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
        ("2024年6月CET4真题+解析+听力音频全3套/2024年6月四级真题-原题", "大学英语四级考试2024年6月真题【第一套】", 2024, 6, 1),
        ("2024年6月CET4真题+解析+听力音频全3套/2024年6月四级真题-原题", "大学英语四级考试2024年6月真题【第二套】", 2024, 6, 2),
        ("2024年6月CET4真题+解析+听力音频全3套/2024年6月四级真题-原题", "大学英语四级考试2024年6月真题【第三套】", 2024, 6, 3),
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
            result = process_file(full_path, "cet4", year, month, session)
            if result and result["sections"]:
                all_papers.append(result)
                section_types = [s["type"] + "/" + s.get("subtype", "") for s in result["sections"]]
                print(f"  -> {len(result['sections'])} sections: {', '.join(section_types)}")
        except Exception as e:
            print(f"  -> Error: {e}")

    # 按时间倒序排列
    all_papers.sort(key=lambda p: (p["year"], p["month"], p.get("session") or 0), reverse=True)

    # 保存
    output_path = os.path.join(base_dir, "..", "src", "data", "exam-papers.json")
    os.makedirs(os.path.dirname(output_path), exist_ok=True)
    with open(output_path, 'w', encoding='utf-8') as f:
        json.dump(all_papers, f, ensure_ascii=False, indent=2)

    # 统计
    cet4 = [p for p in all_papers if p["exam_type"] == "cet4"]
    cet6 = [p for p in all_papers if p["exam_type"] == "cet6"]
    print(f"\n=== Total: {len(all_papers)} papers ===")
    print(f"CET-4: {len(cet4)}, CET-6: {len(cet6)}")
    for paper in all_papers[:3]:
        types = [s["type"] for s in paper["sections"]]
        print(f"  {paper['title']}: {types}")


if __name__ == "__main__":
    main()
