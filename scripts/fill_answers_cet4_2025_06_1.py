#!/usr/bin/env python3
"""Fill answers for CET-4 2025年6月 第1套 from the user's md file."""

import json
import re

JSON_PATH = "/home/yqx/project/English/CET/cet-prep/src/data/exam-papers.json"
MD_PATH = "/home/yqx/project/English/CET/cet-prep/public/2025年6月四级真题原卷（全3套）/2025.6四级第一套解析.md"

# ── Answers from the md file (verified) ──────────────────────────

LISTENING_ANSWERS = {
    "q1": "A", "q2": "B", "q3": "A", "q4": "D", "q5": "C",
    "q6": "D", "q7": "B", "q8": "A", "q9": "C", "q10": "C",
    "q11": "B", "q12": "D", "q13": "B", "q14": "C", "q15": "D",
    "q16": "B", "q17": "A", "q18": "D", "q19": "C", "q20": "A",
    "q21": "D", "q22": "B", "q23": "C", "q24": "D", "q25": "A",
}

# Section A: banked cloze — word answers (not letters, since options are words)
# The bank uses letter prefixes A-O. Map the md answers to actual word values.
# md says: 26D, 27G, 28A, 29E, 30C, 31O, 32N, 33B, 34L, 35M
# Bank: A)accepted B)audiences C)building D)complex E)constitutes F)deputies G)previously H)revolving I)samples J)selected K)solemn L)struggle M)suddenly N)understand O)vary
SECTION_A_ANSWERS = {
    "q26": "D", "q27": "G", "q28": "A", "q29": "E", "q30": "C",
    "q31": "O", "q32": "N", "q33": "B", "q34": "L", "q35": "M",
}

# Section B: matching — paragraph letter answers
SECTION_B_ANSWERS = {
    "q36": "H", "q37": "C", "q38": "L", "q39": "A", "q40": "M",
    "q41": "G", "q42": "K", "q43": "D", "q44": "J", "q45": "B",
}

# Section C: careful reading — from md (incomplete, some skipped)
# md uses ---------- to skip. Only filled answers:
SECTION_C_ANSWERS = {
    # md didn't provide explicit letter answers for Section C
    # The md has detailed analysis for Passage 1 (pandas) and Passage 2 (grit)
    # but the actual A/B/C/D answers aren't clearly stated as "46.A" format
    # We'll need to verify these separately
}

# Writing sample essay
WRITING_SAMPLE = """As a fundamental discipline, College Chinese plays a crucial role in higher education. I firmly support making it a compulsory course because it enhances students' language proficiency, cultural literacy, and analytical abilities.

First, College Chinese strengthens students' reading comprehension and writing skills, which are indispensable for academic papers and professional reports. Many graduates struggle with formal documentation, and this course provides systematic training. Second, through studying classical and contemporary Chinese works, students gain deeper cultural insights and develop national identity, which is particularly valuable in today's globalized world. Most importantly, College Chinese cultivates sophisticated analytical skills. By interpreting complex texts such as ancient poems and philosophical essays, students learn to identify implicit meanings, evaluate different perspectives, and construct well-reasoned arguments—abilities that go beyond academic boundaries and are highly applicable to careers in law, business, and medicine.

In conclusion, mandating College Chinese ensures students acquire essential communication skills, cultural literacy, and analytical thinking capabilities. These competencies make graduates more competitive in the job market while preserving China's literary heritage. Universities should therefore recognize its comprehensive benefits."""

# Translation reference
TRANSLATION_REFERENCE = """Yuan Longping, known globally as the "Father of Hybrid Rice", and his research team overcame numerous challenges to successfully develop a super hybrid rice variety. This technology has been universally recognized as a tremendous success. Through the application of this technology, the rice exhibits stronger drought and disease resistance, adapts to diverse climatic and soil conditions, and achieves a 20-30% increase in yield. The super hybrid rice is also more nutritious and has a superior taste. Currently, the technology has been widely applied in many countries, making significant contributions to global food security."""


def main():
    with open(JSON_PATH, "r", encoding="utf-8") as f:
        papers = json.load(f)

    # Find cet4-2025-06-1
    target_idx = None
    for i, paper in enumerate(papers):
        if paper["id"] == "cet4-2025-06-1":
            target_idx = i
            break

    if target_idx is None:
        print("ERROR: cet4-2025-06-1 not found!")
        return

    paper = papers[target_idx]
    updated_count = 0

    for section in paper["sections"]:
        # ── Writing ──
        if section["type"] == "writing":
            section["sample_answer"] = WRITING_SAMPLE
            updated_count += 1
            print("✅ Writing sample_answer filled")

        # ── Listening ──
        elif section["type"] == "listening":
            for q in section["questions"]:
                if q["id"] in LISTENING_ANSWERS:
                    q["answer"] = LISTENING_ANSWERS[q["id"]]
                    updated_count += 1
            print(f"✅ Listening '{section['title']}' — {len([q for q in section['questions'] if q['id'] in LISTENING_ANSWERS])} answers filled")

        # ── Reading ──
        elif section["type"] == "reading":
            subtype = section.get("subtype", "")
            if subtype == "banked_cloze":
                for q in section["questions"]:
                    if q["id"] in SECTION_A_ANSWERS:
                        q["answer"] = SECTION_A_ANSWERS[q["id"]]
                        updated_count += 1
                print(f"✅ Reading Section A — {len(SECTION_A_ANSWERS)} answers filled")

            elif subtype == "matching":
                for q in section["questions"]:
                    if q["id"] in SECTION_B_ANSWERS:
                        q["answer"] = SECTION_B_ANSWERS[q["id"]]
                        updated_count += 1
                print(f"✅ Reading Section B — {len(SECTION_B_ANSWERS)} answers filled")

            elif subtype == "careful_reading":
                # Section C — no clear letter answers in md, skip for now
                print("⚠️  Reading Section C — no explicit letter answers in md, skipped")

        # ── Translation ──
        elif section["type"] == "translation":
            section["reference_translation"] = TRANSLATION_REFERENCE
            updated_count += 1
            print("✅ Translation reference_translation filled")

    with open(JSON_PATH, "w", encoding="utf-8") as f:
        json.dump(papers, f, ensure_ascii=False, indent=2)

    print(f"\n🎉 Done! {updated_count} fields updated in cet4-2025-06-1")


if __name__ == "__main__":
    main()
