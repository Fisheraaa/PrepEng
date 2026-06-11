#!/usr/bin/env python3
"""
Fix OCR errors and quality issues in exam-papers.json.

Issues addressed:
1. Embedded PDF header/footer text in passages and options (Chinese exam metadata)
2. Stray Unicode characters (・ U+30FB, ®] artifacts)
3. Paragraph spacing in matching (Section B) passages
4. Banked cloze sections with 14 items (missing O) option)
"""

import json
import re
import sys
import os

DATA_FILE = os.path.join(os.path.dirname(__file__), 'src', 'data', 'exam-papers.json')

TARGET_PAPERS = {
    'cet4-2025-06-1', 'cet4-2025-06-2', 'cet4-2025-06-3',
    'cet4-2023-12-1', 'cet4-2023-12-2',
    'cet6-2024-12-2', 'cet6-2024-06-1',
}

# ── 1. Embedded PDF header/footer cleanup ──────────────────────────
# Patterns that match Chinese exam-paper metadata leaking into English text
HEADER_FOOTER_PATTERNS = [
    # Comprehensive: any "真题" with surrounding metadata
    # Matches: "2025年6月四级真题(第二套)", "年 12月四级真题（第二套）-", etc.
    r'\s*・?\s*\d{0,4}年?\s*\d{0,2}月?[四六]级真题\s*[（(]?第?[一二三四\-]?套?[）)]?-?\s*・?\s*',
    # "11 -2025年6月四级真题(第二套)" with leading number-dash
    r'\s*\d+\s*[-—]\s*\d{4}年\s*\d{1,2}月[四六]级真题[（(][第[一二三四]套[）)]-?\s*',
    r'\s*・?\s*[（(]第[一二三四][）)]套?\s*・?\s*',
    # "（第-套）" with dash instead of number (OCR error)
    r'\s*・?\s*[（(]第-套[）)]?\s*・?\s*',
    # Standalone ・ not between words
    r'\s*・\s*',
]

def clean_header_footer(text):
    """Remove embedded PDF header/footer metadata from text."""
    if not isinstance(text, str):
        return text
    for pat in HEADER_FOOTER_PATTERNS:
        text = re.sub(pat, ' ', text)
    # Clean up multiple spaces
    text = re.sub(r'  +', ' ', text)
    # Clean up spaces before punctuation
    text = re.sub(r' ([.,;:!?])', r'\1', text)
    return text.strip()


# ── 2. Specific OCR character fixes ───────────────────────────────
def fix_ocr_chars(text):
    """Fix specific OCR character artifacts."""
    if not isinstance(text, str):
        return text
    # ®] -> nothing (stray symbol artifact)
    text = text.replace('®]', '')
    text = text.replace('®', '')
    return text


# ── 3. Paragraph spacing for matching passages ────────────────────
def fix_matching_paragraphs(text):
    """Ensure proper paragraph breaks between A) B) C) ... paragraphs."""
    if not isinstance(text, str):
        return text
    # Add double newline before each paragraph label (A) through L))
    # but not if it's already preceded by a double newline
    text = re.sub(r'(?<!\n)\n?([A-L]\))', r'\n\n\1', text)
    # Ensure title line is separated from first paragraph
    text = re.sub(r'^(.+?)(\n\n[A-L]\))', r'\1\2', text, count=1)
    # Clean up any triple+ newlines
    text = re.sub(r'\n{3,}', '\n\n', text)
    return text.strip()


# ── 4. Fix banked cloze missing items ─────────────────────────────
# These are data issues that can't be auto-fixed (need original PDF)
# We just report them


def fix_section(section):
    """Apply all fixes to a section dict."""
    fixes_applied = []

    # Fix passage text
    if 'passage' in section and isinstance(section['passage'], str):
        original = section['passage']
        section['passage'] = clean_header_footer(section['passage'])
        section['passage'] = fix_ocr_chars(section['passage'])
        if section.get('subtype') == 'matching':
            section['passage'] = fix_matching_paragraphs(section['passage'])
        if section['passage'] != original:
            fixes_applied.append('passage_cleaned')

    # Fix source_text (translation)
    if 'source_text' in section and isinstance(section['source_text'], str):
        original = section['source_text']
        section['source_text'] = clean_header_footer(section['source_text'])
        section['source_text'] = fix_ocr_chars(section['source_text'])
        if section['source_text'] != original:
            fixes_applied.append('source_text_cleaned')

    # Fix prompt
    if 'prompt' in section and isinstance(section['prompt'], str):
        original = section['prompt']
        section['prompt'] = clean_header_footer(section['prompt'])
        section['prompt'] = fix_ocr_chars(section['prompt'])
        if section['prompt'] != original:
            fixes_applied.append('prompt_cleaned')

    # Fix questions
    if 'questions' in section:
        for qi, q in enumerate(section['questions']):
            if isinstance(q, dict):
                if 'content' in q and isinstance(q['content'], str):
                    orig = q['content']
                    q['content'] = clean_header_footer(q['content'])
                    q['content'] = fix_ocr_chars(q['content'])
                    if q['content'] != orig:
                        fixes_applied.append(f'question_{qi}_content_cleaned')

                if 'options' in q:
                    for oi, opt in enumerate(q['options']):
                        if isinstance(opt, str):
                            orig = opt
                            cleaned = clean_header_footer(opt)
                            cleaned = fix_ocr_chars(cleaned)
                            if cleaned != orig:
                                q['options'][oi] = cleaned
                                fixes_applied.append(f'question_{qi}_option_{oi}_cleaned')

    return fixes_applied


def main():
    print(f"Reading {DATA_FILE} ...")
    with open(DATA_FILE, 'r', encoding='utf-8') as f:
        papers = json.load(f)

    total_fixes = 0
    report = {}

    for paper in papers:
        paper_id = paper['id']
        if paper_id not in TARGET_PAPERS:
            continue

        paper_fixes = []
        for si, section in enumerate(paper.get('sections', [])):
            if not isinstance(section, dict):
                continue
            fixes = fix_section(section)
            if fixes:
                paper_fixes.extend([(si, f) for f in fixes])

        if paper_fixes:
            report[paper_id] = paper_fixes
            total_fixes += len(paper_fixes)

    # Write back
    print(f"Writing fixed data back to {DATA_FILE} ...")
    with open(DATA_FILE, 'w', encoding='utf-8') as f:
        json.dump(papers, f, ensure_ascii=False, indent=2)

    # Print report
    print(f"\n{'='*60}")
    print(f"FIX REPORT - {total_fixes} fixes applied across {len(report)} papers")
    print(f"{'='*60}")
    for paper_id, fixes in report.items():
        print(f"\n{paper_id}:")
        for si, fix_desc in fixes:
            print(f"  section[{si}]: {fix_desc}")

    # Report unfixable issues
    print(f"\n{'='*60}")
    print("ISSUES THAT CANNOT BE AUTO-FIXED:")
    print(f"{'='*60}")
    print()
    print("1. Missing sections (need original PDF data):")
    print("   - cet4-2025-06-3: missing listening sections")
    print("   - cet4-2025-06-2: has writing section (present), has listening (present)")
    print("   - cet6-2024-12-2: missing Section A listening (short news)")
    print("   - cet4-2023-12-2: missing ALL reading sections (banked_cloze, matching, careful_reading)")
    print()
    print("2. Banked cloze with 14 items (missing O) word, need PDF):")
    for paper in papers:
        for section in paper.get('sections', []):
            if isinstance(section, dict) and section.get('subtype') == 'banked_cloze':
                bank = section.get('bank', [])
                if len(bank) == 14:
                    letters = sorted([b[0] for b in bank])
                    all_letters = [chr(65+i) for i in range(15)]
                    missing = [l for l in all_letters if l not in letters]
                    print(f"   - {paper['id']}: missing option {missing[0]})")
    print()
    print("3. cet4-2025-06-1 passage (section[5]):")
    print("   The £ symbol is legitimate (British pounds) - NOT an OCR error")
    print()


if __name__ == '__main__':
    main()
