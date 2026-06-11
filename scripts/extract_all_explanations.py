#!/usr/bin/env python3
"""Extract explanations from all available PDFs and fill into exam-papers.json."""

import json
import re
import pdfplumber
import os
import glob

JSON_PATH = "src/data/exam-papers.json"

# PDF 文件映射：paper_id -> pdf_path
PDF_MAP = {
    # CET4 2025.06
    "cet4-2025-06-2": "public/2025年6月四级真题原卷（全3套）/2025.06英语四级解析第2套.pdf",
    "cet4-2025-06-3": "public/2025年6月四级真题原卷（全3套）/2025.06英语四级解析第3套.pdf",
    # CET4 2024.06
    "cet4-2024-06-1": "public/2024年6月CET4真题+解析+听力音频全3套/2024年6月四级真题-答案解析/2024年6月四级真题解析【第一套】.pdf",
    "cet4-2024-06-2": "public/2024年6月CET4真题+解析+听力音频全3套/2024年6月四级真题-答案解析/2024年6月四级真题解析【第二套】.pdf",
    "cet4-2024-06-3": "public/2024年6月CET4真题+解析+听力音频全3套/2024年6月四级真题-答案解析/2024年6月四级真题解析【第三套】.pdf",
    # CET4 2023.12
    "cet4-2023-12-2": "public/2023年12月CET4真题+解析+听力音频全3套/2023.12英语四级解析第2套.pdf",
    "cet4-2023-12-3": "public/2023年12月CET4真题+解析+听力音频全3套/2023.12英语四级解析第3套.pdf",
    # CET4 2023.06
    "cet4-2023-06-1": "public/2023年6月CET4真题+解析+听力音频全3套/2023.6四级真题及解析/2023.6四级解析第1套.pdf",
    "cet4-2023-06-2": "public/2023年6月CET4真题+解析+听力音频全3套/2023.6四级真题及解析/2023.6四级解析第2套.pdf",
    "cet4-2023-06-3": "public/2023年6月CET4真题+解析+听力音频全3套/2023.6四级真题及解析/2023.6四级解析第3套.pdf",
    # CET6 2024.12
    "cet6-2024-12-1": "public/CET6/2024年12月CET6/03、答案解析/2024.12英语六级解析第1套.pdf",
    "cet6-2024-12-2": "public/CET6/2024年12月CET6/03、答案解析/2024.12英语六级解析第2套.pdf",
    "cet6-2024-12-3": "public/CET6/2024年12月CET6/03、答案解析/2024.12英语六级解析第3套.pdf",
    # CET6 2024.06
    "cet6-2024-06-1": "public/CET6/2024年06月CET6/03、答案解析/2024.6六级第一套解析.pdf",
    "cet6-2024-06-2": "public/CET6/2024年06月CET6/03、答案解析/2024.6六级第二套解析.pdf",
    "cet6-2024-06-3": "public/CET6/2024年06月CET6/03、答案解析/2024.6六级第三套解析.pdf",
    # CET6 2023.12
    "cet6-2023-12-1": "public/CET6/2023年12月CET6/03、答案解析/2023.12英语六级解析第1套.pdf",
    # CET6 2023.06
    "cet6-2023-06-1": "public/CET6/2023年06月CET6/03、答案解析/2023.06英语六级解析第1套.pdf",
    "cet6-2023-06-2": "public/CET6/2023年06月CET6/03、答案解析/2023.06英语六级解析第2套.pdf",
    "cet6-2023-06-3": "public/CET6/2023年06月CET6/03、答案解析/2023.06英语六级解析第3套.pdf",
    # CET6 2022.06
    "cet6-2022-06-1": "public/CET6/2022年06月CET6/03、答案解析/2022.06英语六级考试第1套解析.pdf",
    "cet6-2022-06-2": "public/CET6/2022年06月CET6/03、答案解析/2022.06英语六级真题解析第2套 .pdf",
    "cet6-2022-06-3": "public/CET6/2022年06月CET6/03、答案解析/2022.06英语六级真题解析第3套 .pdf",
}

def extract_from_pdf(pdf_path):
    """Extract explanations from a PDF file."""
    explanations = {}

    try:
        with pdfplumber.open(pdf_path) as pdf:
            full_text = ""
            for page in pdf.pages:
                text = page.extract_text()
                if text:
                    full_text += text + "\n"
    except Exception as e:
        print(f"  Error reading PDF: {e}")
        return explanations

    # 提取听力答案解析 (q1-q25)
    for i in range(1, 26):
        # 模式：题号...解析...故选X
        patterns = [
            rf'{i}[.\s].*?解析[：:]?\s*(.*?故选[A-D]。)',
            rf'{i}[.\s].*?答案[：:]?\s*(.*?故选[A-D]。)',
            rf'{i}[.\s].*?([一-鿿].*?故选[A-D]。)',
        ]
        for pattern in patterns:
            match = re.search(pattern, full_text, re.DOTALL)
            if match:
                exp = match.group(1).strip()
                exp = re.sub(r'\s+', ' ', exp)
                if len(exp) > 150:
                    exp = exp[:150] + "..."
                explanations[f'q{i}'] = exp
                break

    # 提取阅读答案解析 (q26-q55)
    for i in range(26, 56):
        patterns = [
            rf'{i}[.\s].*?([A-Z]\).*?[，。])',
            rf'{i}[.\s].*?([一-鿿]{10,50}[。])',
        ]
        for pattern in patterns:
            match = re.search(pattern, full_text, re.DOTALL)
            if match:
                exp = match.group(1).strip()
                exp = re.sub(r'\s+', ' ', exp)
                if len(exp) > 150:
                    exp = exp[:150] + "..."
                explanations[f'q{i}'] = exp
                break

    return explanations

def main():
    with open(JSON_PATH, 'r', encoding='utf-8') as f:
        data = json.load(f)

    total_filled = 0

    for paper in data:
        pid = paper.get('id')
        if pid not in PDF_MAP:
            continue

        pdf_path = PDF_MAP[pid]
        if not os.path.exists(pdf_path):
            print(f"❌ {pid}: PDF 不存在")
            continue

        # 检查是否已有解析
        has_exp = sum(1 for s in paper.get('sections', []) for q in s.get('questions', []) if q.get('explanation') and q.get('explanation') != '暂无解析')
        total_q = sum(len(s.get('questions', [])) for s in paper.get('sections', []))
        if has_exp == total_q:
            print(f"⏭️ {pid}: 已有完整解析")
            continue

        print(f"📄 {pid}: 提取中...")
        explanations = extract_from_pdf(pdf_path)

        if not explanations:
            print(f"  ⚠️ 未提取到解析")
            continue

        # 填入
        filled = 0
        for section in paper.get('sections', []):
            for q in section.get('questions', []):
                qid = q.get('id')
                if qid in explanations and (not q.get('explanation') or q.get('explanation') == '暂无解析'):
                    q['explanation'] = explanations[qid]
                    filled += 1

        print(f"  ✅ 填入 {filled} 个解析")
        total_filled += filled

    print(f"\n总计填入 {total_filled} 个解析")

    with open(JSON_PATH, 'w', encoding='utf-8') as f:
        json.dump(data, f, ensure_ascii=False, indent=2)

if __name__ == '__main__':
    main()
