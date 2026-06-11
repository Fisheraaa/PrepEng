#!/usr/bin/env python3
"""Merge answer keys from answers-2023.json into exam-papers.json.

For each paper that has a matching answer key:
  - Set the writing section's sample_answer field
  - Set the translation section's reference_translation field
"""

import json
import os

SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
BASE_DIR = os.path.join(SCRIPT_DIR, "..", "src", "data")

ANSWERS_PATH = os.path.join(BASE_DIR, "answers-2023.json")
PAPERS_PATH = os.path.join(BASE_DIR, "exam-papers.json")


def main():
    with open(ANSWERS_PATH, "r", encoding="utf-8") as f:
        answers = json.load(f)

    with open(PAPERS_PATH, "r", encoding="utf-8") as f:
        papers = json.load(f)

    matched = 0
    unmatched_keys = []

    for answer_id, content in answers.items():
        # Find the matching paper
        paper = None
        for p in papers:
            if p["id"] == answer_id:
                paper = p
                break

        if paper is None:
            unmatched_keys.append(answer_id)
            print(f"  [SKIP] {answer_id} -- no matching paper found")
            continue

        # Set writing sample_answer
        writing_sample = content.get("writing_sample", "")
        if writing_sample:
            for section in paper["sections"]:
                if section["type"] == "writing":
                    section["sample_answer"] = writing_sample
                    break

        # Set translation reference_translation
        translation_ref = content.get("translation_reference", "")
        if translation_ref:
            for section in paper["sections"]:
                if section["type"] == "translation":
                    section["reference_translation"] = translation_ref
                    break

        matched += 1
        print(f"  [OK] {answer_id}")

    # Save
    with open(PAPERS_PATH, "w", encoding="utf-8") as f:
        json.dump(papers, f, ensure_ascii=False, indent=2)

    print(f"\nMerged {matched} answer keys into exam-papers.json")
    if unmatched_keys:
        print(f"Unmatched answer keys ({len(unmatched_keys)}): {unmatched_keys}")


if __name__ == "__main__":
    main()
