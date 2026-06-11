#!/usr/bin/env python3
"""Fix incorrect explanations for cet4-2025-06-1."""

import json

JSON_PATH = "src/data/exam-papers.json"

# 修正的解析
FIXES = {
    "q5": "新闻提到服装行业因制造严重危害环境的废弃物问题而备受指责。故选C。",
    "q6": "研究人员提出生产税等政策是为了激励制造商和消费者增强废弃物意识。故选D。",
    "q7": "新闻说找出供应链中问题的根源至关重要。故选B。",
    "q16": "研究人员说语言不是被发明的，而是进化而来的。故选A。",
    "q17": "第一种理论认为语言始于人们模仿周围事物的声音，如动物叫声、自然声等。故选C。",
    "q18": "理论认为转向发声是因为说话可以让你在看不到对方时也能交流。故选D。",
    "q19": "研究表明与治疗犬互动对承受压力的学生的执行功能有积极影响。故选C。",
    "q20": "研究测量了参与者的执行功能，即计划、组织、激励、集中和记忆的技能。故选B。",
    "q21": "彭德里认为传统压力管理课程会给陷入困境的学生增加压力。故选B。",
    "q22": "文章说承担风险需要悉心规划和努力工作，而非盲目冒险。故选A。",
    "q23": "愿意尝试新想法是企业发展的关键。故选D。",
    "q24": "失败时应从失败中吸取教训，勇往直前。故选B。",
    "q25": "当大多数人规避风险时，风险承担者的竞争会减少。故选D。",
}

def main():
    with open(JSON_PATH, 'r', encoding='utf-8') as f:
        data = json.load(f)

    for paper in data:
        if paper.get('id') != 'cet4-2025-06-1':
            continue

        fixed = 0
        for section in paper.get('sections', []):
            for q in section.get('questions', []):
                qid = q.get('id')
                if qid in FIXES:
                    q['explanation'] = FIXES[qid]
                    fixed += 1

        print(f"Fixed {fixed} explanations")
        break

    with open(JSON_PATH, 'w', encoding='utf-8') as f:
        json.dump(data, f, ensure_ascii=False, indent=2)

if __name__ == '__main__':
    main()
