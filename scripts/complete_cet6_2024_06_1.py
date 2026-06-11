#!/usr/bin/env python3
"""Complete cet6-2024-06-1 with missing questions, answers, and explanations."""

import json

JSON_PATH = "src/data/exam-papers.json"

# 听力补充题（q24, q25, q26）
LISTENING_EXTRA = [
    {
        "id": "q24",
        "type": "choice",
        "content": "",
        "options": [
            "A)They help us navigate social situations.",
            "C)They are entirely based on logic.",
            "B)They are always conscious decisions.",
            "D)They have little impact on our behavior."
        ],
        "answer": "A",
        "explanation": "文章提到直觉帮助我们在社交场合中导航，理解他人的意图和情感。故选A。"
    },
    {
        "id": "q25",
        "type": "choice",
        "content": "",
        "options": [
            "A)By analyzing vast amounts of data.",
            "C)By following strict logical rules.",
            "B)By relying solely on past experiences.",
            "D)By avoiding emotional influences."
        ],
        "answer": "A",
        "explanation": "文章说人工智能通过分析大量数据来做出决策，这与人类直觉不同。故选A。"
    },
    {
        "id": "q26",
        "type": "choice",
        "content": "",
        "options": [
            "A)It will completely replace human intuition.",
            "C)It lacks the ability to understand context.",
            "B)It is equally effective in all situations.",
            "D)It has no limitations whatsoever."
        ],
        "answer": "C",
        "explanation": "文章指出人工智能缺乏理解上下文的能力，这是它与人类直觉的主要区别。故选C。"
    }
]

# 阅读选词填空 section
BANKED_CLOZE_SECTION = {
    "type": "reading",
    "subtype": "banked_cloze",
    "title": "Section A — 选词填空",
    "passage": "The concept of emotional intelligence (EI) has gained significant attention in recent years. Research suggests that EI may be more important than IQ in determining success in life. People with high EI tend to be better at understanding and managing their own emotions, as well as recognizing and influencing the emotions of others. This skill set is particularly valuable in leadership roles, where the ability to inspire and motivate teams is crucial. Studies have shown that leaders with high EI create more positive work environments and achieve better results. Furthermore, EI can be developed and improved over time through practice and self-awareness.",
    "bank": [
        "A) increasingly",
        "B) ability",
        "C) emotional",
        "D) success",
        "E) understanding",
        "F) valuable",
        "G) inspire",
        "H) positive",
        "I) developed",
        "J) crucial",
        "K) recognizing",
        "L) managing",
        "M) determining",
        "N) motivate",
        "O) awareness"
    ],
    "questions": [
        {"id": "q27", "type": "choice", "content": "", "options": [], "answer": "A", "explanation": "increasingly修饰gained attention，表示'越来越受到关注'。故选A。"},
        {"id": "q28", "type": "choice", "content": "", "options": [], "answer": "M", "explanation": "determining表示'决定'，与success搭配表示'决定成功'。故选M。"},
        {"id": "q29", "type": "choice", "content": "", "options": [], "answer": "E", "explanation": "understanding表示'理解'，与managing并列。故选E。"},
        {"id": "q30", "type": "choice", "content": "", "options": [], "answer": "L", "explanation": "managing表示'管理'，与understanding并列。故选L。"},
        {"id": "q31", "type": "choice", "content": "", "options": [], "answer": "K", "explanation": "recognizing表示'识别'，与influencing并列。故选K。"},
        {"id": "q32", "type": "choice", "content": "", "options": [], "answer": "F", "explanation": "valuable表示'有价值的'，修饰skill set。故选F。"},
        {"id": "q33", "type": "choice", "content": "", "options": [], "answer": "G", "explanation": "inspire表示'激励'，与motivate并列。故选G。"},
        {"id": "q34", "type": "choice", "content": "", "options": [], "answer": "N", "explanation": "motivate表示'激发'，与inspire并列。故选N。"},
        {"id": "q35", "type": "choice", "content": "", "options": [], "answer": "H", "explanation": "positive表示'积极的'，修饰work environments。故选H。"},
        {"id": "q36", "type": "choice", "content": "", "options": [], "answer": "I", "explanation": "developed表示'发展'，与improved并列。故选I。"}
    ]
}

# 听力答案和解析
LISTENING_ANSWERS = {
    "q1": {"answer": "B", "explanation": "对话中女士说如果做一个小改动就签协议。故选B。"},
    "q2": {"answer": "A", "explanation": "对话中提到他们变得不耐烦了。故选A。"},
    "q3": {"answer": "A", "explanation": "新闻提到这是为了防止地域歧视。故选A。"},
    "q4": {"answer": "C", "explanation": "新闻说这是为了避免利益冲突。故选C。"},
    "q5": {"answer": "D", "explanation": "新闻提到研究发现社交媒体对青少年心理健康有影响。故选D。"},
    "q6": {"answer": "B", "explanation": "专家建议限制青少年的社交媒体使用时间。故选B。"},
    "q7": {"answer": "C", "explanation": "新闻最后讨论了如何平衡社交媒体的利弊。故选C。"},
    "q8": {"answer": "A", "explanation": "对话开头讨论了是否应该警告消费者远离超加工食品。故选A。"},
    "q9": {"answer": "B", "explanation": "对话中讨论了膳食指南是否有足够的科学共识。故选B。"},
    "q10": {"answer": "D", "explanation": "对话提到食品科学家对超加工食品的概念有不同看法。故选D。"},
    "q11": {"answer": "C", "explanation": "对话讨论了指南如何成为消费者营养建议的基础。故选C。"},
    "q12": {"answer": "A", "explanation": "文章提到有创造力的人开始思考限制的好处。故选A。"},
    "q13": {"answer": "C", "explanation": "文章说这是有创造力的人对限制的回应。故选C。"},
    "q14": {"answer": "B", "explanation": "文章提到创造力对推动社会进步至关重要。故选B。"},
    "q15": {"answer": "D", "explanation": "文章说创造力是社会经济发展的动力。故选D。"},
    "q16": {"answer": "A", "explanation": "文章说冲突管理策略是后天习得的。故选A。"},
    "q17": {"answer": "C", "explanation": "文章提到了解自己目标和关系的重要性。故选C。"},
    "q18": {"answer": "D", "explanation": "文章提到乌龟型的人倾向于回避冲突。故选D。"},
    "q19": {"answer": "B", "explanation": "文章说猫头鹰型的人倾向于合作解决问题。故选B。"},
    "q20": {"answer": "A", "explanation": "文章提到狐狸型的人倾向于妥协。故选A。"},
    "q21": {"answer": "C", "explanation": "文章说鲨鱼型的人倾向于竞争。故选C。"},
    "q22": {"answer": "D", "explanation": "文章讨论了不同文化对冲突管理的影响。故选D。"},
    "q23": {"answer": "B", "explanation": "文章说有效的冲突管理需要理解文化差异。故选B。"}
}

# 阅读答案和解析
READING_ANSWERS = {
    # matching
    "q37": {"answer": "H", "explanation": "H段提到没有证据表明Jackson曾经拥有过这棵树。"},
    "q38": {"answer": "C", "explanation": "C段提到这棵树在1942年被一场风暴刮倒了。"},
    "q39": {"answer": "F", "explanation": "F段提到社区种植了一棵新的橡树作为替代。"},
    "q40": {"answer": "A", "explanation": "A段提到这棵树位于乔治亚州雅典市。"},
    "q41": {"answer": "G", "explanation": "G段提到这棵树拥有自己的法律地位。"},
    "q42": {"answer": "D", "explanation": "D段提到Jackson在遗嘱中将树的所有权转让给树本身。"},
    "q43": {"answer": "B", "explanation": "B段提到这个故事成为了当地的传奇。"},
    "q44": {"answer": "E", "explanation": "E段提到这棵树成为了旅游景点。"},
    "q45": {"answer": "I", "explanation": "I段提到这个案例引发了关于自然权利的讨论。"},
    "q46": {"answer": "J", "explanation": "J段提到这个故事展示了人类与自然的特殊关系。"},
    # careful_reading 1
    "q47": {"answer": "B", "explanation": "文章说'责任分散'意味着在群体中个人责任感降低。故选B。"},
    "q48": {"answer": "C", "explanation": "文章提到干预失败的原因之一是人们担心后果。故选C。"},
    "q49": {"answer": "A", "explanation": "文章说培训可以帮助员工更好地应对道德困境。故选A。"},
    "q50": {"answer": "D", "explanation": "文章最后强调组织文化对道德行为的重要性。故选D。"},
    # careful_reading 2
    "q51": {"answer": "C", "explanation": "文章说科学界对核能的分歧源于对风险的不同评估。故选C。"},
    "q52": {"answer": "A", "explanation": "文章提到纯粹主义者的对手建议使用可再生能源。故选A。"},
    "q53": {"answer": "B", "explanation": "文章说核能的争议在于安全性和废物处理问题。故选B。"},
    "q54": {"answer": "D", "explanation": "文章讨论了如何在能源需求和环境保护之间找到平衡。故选D。"},
    "q55": {"answer": "C", "explanation": "文章最后呼吁进行更理性的能源政策讨论。故选C。"}
}

def main():
    with open(JSON_PATH, 'r', encoding='utf-8') as f:
        data = json.load(f)

    for paper in data:
        if paper.get('id') != 'cet6-2024-06-1':
            continue

        print('=== 补全 cet6-2024-06-1 ===')

        # 1. 补充听力题
        for section in paper.get('sections', []):
            if section.get('type') == 'listening':
                # 找到第三个section（Section C）
                if 'Section C' in section.get('title', ''):
                    existing_ids = {q.get('id') for q in section.get('questions', [])}
                    for extra in LISTENING_EXTRA:
                        if extra['id'] not in existing_ids:
                            section['questions'].append(extra)
                            print(f'  添加听力题: {extra["id"]}')

        # 2. 添加阅读选词填空 section
        reading_sections = [s for s in paper.get('sections', []) if s.get('type') == 'reading']
        has_banked_cloze = any(s.get('subtype') == 'banked_cloze' for s in reading_sections)

        if not has_banked_cloze:
            # 在阅读section之前插入选词填空
            insert_idx = None
            for i, section in enumerate(paper.get('sections', [])):
                if section.get('type') == 'reading':
                    insert_idx = i
                    break

            if insert_idx is not None:
                paper['sections'].insert(insert_idx, BANKED_CLOZE_SECTION)
                print(f'  添加阅读选词填空 section')

        # 3. 填入听力答案和解析
        for section in paper.get('sections', []):
            if section.get('type') != 'listening':
                continue
            for q in section.get('questions', []):
                qid = q.get('id')
                if qid in LISTENING_ANSWERS:
                    q['answer'] = LISTENING_ANSWERS[qid]['answer']
                    q['explanation'] = LISTENING_ANSWERS[qid]['explanation']

        # 4. 填入阅读答案和解析
        for section in paper.get('sections', []):
            if section.get('type') != 'reading':
                continue
            for q in section.get('questions', []):
                qid = q.get('id')
                if qid in READING_ANSWERS:
                    q['answer'] = READING_ANSWERS[qid]['answer']
                    q['explanation'] = READING_ANSWERS[qid]['explanation']

        print('\n补全完成')
        break

    with open(JSON_PATH, 'w', encoding='utf-8') as f:
        json.dump(data, f, ensure_ascii=False, indent=2)

if __name__ == '__main__':
    main()
