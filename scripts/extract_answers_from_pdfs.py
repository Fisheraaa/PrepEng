#!/usr/bin/env python3
"""Extract answer keys from 解析 PDFs for 6 remaining papers."""

import pdfplumber
import re
import json

# ── PDF paths for each target paper ──────────────────────────
PDF_MAP = {
    "cet4-2025-06-2": "/home/yqx/project/English/CET/cet-prep/public/2025年6月四级真题原卷（全3套）/2025.06英语四级解析第2套.pdf",
    "cet4-2025-06-3": "/home/yqx/project/English/CET/cet-prep/public/2025年6月四级真题原卷（全3套）/2025.06英语四级解析第3套.pdf",
    "cet4-2023-12-1": "/home/yqx/project/English/CET/cet-prep/public/2023年12月CET4真题+解析+听力音频全3套/2023.12英语四级解析第1套.pdf",
    "cet4-2022-06-1": "/home/yqx/project/English/CET/cet-prep/public/2022年06月四级真题+解析+听力音频全3套/【答案-第1套】2022.06英语四级答案解析（第1套）.pdf",
    "cet6-2024-12-2": "/home/yqx/project/English/CET/cet-prep/public/CET6/2024年12月CET6/03、答案解析/2024.12英语六级解析第2套.pdf",
    "cet6-2024-06-1": "/home/yqx/project/English/CET/cet-prep/public/CET6/2024年06月CET6/03、答案解析/2024.6六级第一套解析.pdf",
}


def extract_full_text(pdf_path):
    """Extract all text from a PDF."""
    pages = []
    with pdfplumber.open(pdf_path) as pdf:
        for page in pdf.pages:
            text = page.extract_text()
            if text:
                pages.append(text)
    return "\n".join(pages)


def extract_answers_from_text(text, paper_id):
    """Parse answer key text and extract structured answers."""
    result = {
        "listening": {},
        "reading_section_a": {},
        "reading_section_b": {},
        "reading_section_c": {},
        "writing_sample": "",
        "translation_reference": "",
    }

    # ── Extract listening answers (1-25) ──
    # Common patterns: "1. A", "1.A", "1、A", "Question 1: A"
    for i in range(1, 26):
        # Try multiple patterns
        patterns = [
            rf'(?:^|\s){i}\.\s*([A-D])\b',           # 1. A
            rf'(?:^|\s){i}\.\s*\[([A-D])\]',          # 1. [A]
            rf'(?:^|\s){i}、\s*([A-D])\b',            # 1、A
            rf'Question\s+{i}[^A-D]*([A-D])\b',       # Question 1 ... A
            rf'{i}\s*[：:]\s*([A-D])\b',              # 1: A or 1：A
        ]
        for pat in patterns:
            m = re.search(pat, text, re.IGNORECASE | re.MULTILINE)
            if m:
                result["listening"][f"q{i}"] = m.group(1).upper()
                break

    # ── Extract reading Section A answers (26-35) ──
    for i in range(26, 36):
        patterns = [
            rf'(?:^|\s){i}\.\s*([A-O])\b',
            rf'(?:^|\s){i}、\s*([A-O])\b',
            rf'{i}\s*[：:]\s*([A-O])\b',
            rf'(?:^|\s){i}\s+([A-O])\b',
        ]
        for pat in patterns:
            m = re.search(pat, text, re.IGNORECASE | re.MULTILINE)
            if m:
                result["reading_section_a"][f"q{i}"] = m.group(1).upper()
                break

    # ── Extract reading Section B answers (36-45) ──
    for i in range(36, 46):
        patterns = [
            rf'(?:^|\s){i}\.\s*([A-M])\b',
            rf'(?:^|\s){i}、\s*([A-M])\b',
            rf'{i}\s*[：:]\s*([A-M])\b',
            rf'(?:^|\s){i}\s+([A-M])\b',
        ]
        for pat in patterns:
            m = re.search(pat, text, re.IGNORECASE | re.MULTILINE)
            if m:
                result["reading_section_b"][f"q{i}"] = m.group(1).upper()
                break

    # ── Extract reading Section C answers (46-55) ──
    for i in range(46, 56):
        patterns = [
            rf'(?:^|\s){i}\.\s*([A-D])\b',
            rf'(?:^|\s){i}、\s*([A-D])\b',
            rf'{i}\s*[：:]\s*([A-D])\b',
            rf'(?:^|\s){i}\s+([A-D])\b',
        ]
        for pat in patterns:
            m = re.search(pat, text, re.IGNORECASE | re.MULTILINE)
            if m:
                result["reading_section_c"][f"q{i}"] = m.group(1).upper()
                break

    return result


def main():
    all_results = {}
    for paper_id, pdf_path in PDF_MAP.items():
        print(f"\n{'='*60}")
        print(f"Processing: {paper_id}")
        print(f"PDF: {pdf_path}")
        try:
            text = extract_full_text(pdf_path)
            print(f"  Extracted {len(text)} chars from PDF")

            # Save raw text for debugging
            raw_path = f"/home/yqx/project/English/CET/cet-prep/scripts/raw_{paper_id}.txt"
            with open(raw_path, "w", encoding="utf-8") as f:
                f.write(text)

            answers = extract_answers_from_text(text, paper_id)
            all_results[paper_id] = answers

            print(f"  Listening: {len(answers['listening'])} answers")
            print(f"  Reading A: {len(answers['reading_section_a'])} answers")
            print(f"  Reading B: {len(answers['reading_section_b'])} answers")
            print(f"  Reading C: {len(answers['reading_section_c'])} answers")

            # Show the answers
            if answers['listening']:
                print(f"  Listening answers: {answers['listening']}")
            if answers['reading_section_a']:
                print(f"  Section A answers: {answers['reading_section_a']}")
            if answers['reading_section_b']:
                print(f"  Section B answers: {answers['reading_section_b']}")
            if answers['reading_section_c']:
                print(f"  Section C answers: {answers['reading_section_c']}")

        except Exception as e:
            print(f"  ERROR: {e}")
            all_results[paper_id] = None

    # Save results
    out_path = "/home/yqx/project/English/CET/cet-prep/scripts/extracted_answers.json"
    with open(out_path, "w", encoding="utf-8") as f:
        json.dump(all_results, f, ensure_ascii=False, indent=2)
    print(f"\n\nResults saved to {out_path}")


if __name__ == "__main__":
    main()
