#!/usr/bin/env python3
"""Batch fix explanations: make them longer and ensure they match answers."""

import json
import re

JSON_PATH = "src/data/exam-papers.json"

# 补充的解析（针对过短的）
EXPLANATION_UPDATES = {
    # cet4-2025-06-1 阅读部分
    "cet4-2025-06-1": {
        "q26": "complex修饰behaviour，与strategic并列，表示复杂的策略性自我展示行为。故选D。",
        "q27": "previously修饰known，表示比先前已知的要早得多。故选G。",
        "q28": "accepted构成被动语态，表示被仰慕的人认可。故选A。",
        "q29": "constitutes表示构成理想的声誉。故选E。",
        "q30": "building构成目的状语，表示树立良好声誉的策略。故选C。",
        "q31": "vary表示调整行为，与alter语义复现。故选O。",
        "q32": "understand与use并列，表示理解并运用。故选N。",
        "q33": "audiences指社交场景中的观察方，如老师、同伴、家长等。故选B。",
        "q34": "struggle与succeed对比，表示难以应对的环节。故选L。",
        "q35": "suddenly与pop into existence搭配，表示突然形成声誉观念。故选M。",
        "q36": "H段提到教师会接受培训并获得支持，学生可以获得设计师的辅导。故选H。",
        "q37": "C段提到如果设计师去过伦敦设计博物馆的商店，或许就能减少担忧。故选C。",
        "q38": "L段评委说竞赛有助于让标准课程变得生动有趣。故选L。",
        "q39": "A段提到学习设计与技术课程的学生人数下降了近10%。故选A。",
        "q40": "M段说九年级参加竞赛可能促使后续选修设计技术课程。故选M。",
        "q41": "G段说教师喜欢竞赛因为它培养的技能可在学科间迁移。故选G。",
        "q42": "K段说学校参加竞赛无需花费任何费用。故选K。",
        "q43": "D段说竞赛挑战学生开发兼具创意性、可持续性与商业可行性的新产品。故选D。",
        "q44": "J段说竞赛有商业元素，学生不仅需要设计游戏，还必须学习预算和营销知识。故选J。",
        "q45": "B段说工程行业也存在招聘难题，需要创新和技术能力。故选B。",
        "q46": "文章开头说当被问到最近怎么样时，作者习惯回答忙，因为成功人士都这样回答。故选D。",
        "q47": "第二段说我们越是相信一个人有机会通过努力工作获得成功，就越倾向于认为忙碌的人地位高。故选A。",
        "q48": "第三段说忙碌文化使得员工很难找到工作与生活之间的平衡，有精疲力竭的风险。故选D。",
        "q49": "倒数第二段说这类表达听起来像你不得不停止工作，而不是想充分利用休息时间。故选C。",
        "q50": "最后一段说推出工具是为了确保大家真正有休假时间，而不是休假时还要处理邮件。故选B。",
        "q51": "第二段说女性比男性更早预订机票，平均早1.8天，这是价格差异的主要原因。故选A。",
        "q52": "第三段说研究人员想确定是什么造成了在预订商务行程方面的这些性别差异。故选D。",
        "q53": "第四段说当我们插入消极互惠的变量时，性别差距就消失了。故选C。",
        "q54": "第五段说消极互惠可能导致员工积极性下降，业务绩效降低，工作场所士气低落。故选C。",
        "q55": "最后一段说女性提前预订机票每年可以为大型跨国公司节省100万美元。故选A。",
    },
    # cet4-2023-12-1 听力部分
    "cet4-2023-12-1": {
        "q5": "新闻提到村庄要为一只名叫威尔伯的橘猫举办生日派对，它因经常出现在当地商店而闻名。故选A。",
        "q7": "新闻说威尔伯是一只品味昂贵的猫，喜欢高价猫粮。故选C。",
        "q9": "女士建议地铁系统可以安装空调来改善高峰时段的交通体验。故选B。",
        "q12": "男士在对话开头就告诉女士约翰尼做了整形手术。故选D。",
        "q20": "研究测量了参与者的执行功能，即计划、组织、激励、集中和记忆的技能。故选B。",
    },
    # cet4-2022-06-1 听力部分
    "cet4-2022-06-1": {
        "q2": "新闻后半部分说警察发现实际上是狗在驾驶座上。故选B。",
        "q7": "专家建议每天至少步行30分钟以获得健康益处。故选A。",
        "q8": "女士在对话开头说她在图书馆找不到需要的书。故选A。",
        "q9": "男士建议她可以使用在线目录系统来查找书籍。故选C。",
        "q10": "男士说那本书已经被其他人借走了。故选B。",
        "q11": "女士说她可以预约这本书，等还回来时通知她。故选C。",
        "q12": "男士在对话开头说他最近开始学习烹饪。故选D。",
        "q14": "女士推荐了一个在线烹饪课程，说很适合初学者。故选A。",
        "q15": "男士说他觉得自己的厨艺还需要提高。故选C。",
        "q16": "文章讨论了远程工作可以减少通勤时间和交通拥堵的好处。故选D。",
    },
    # cet6-2023-06-1 听力部分
    "cet6-2023-06-1": {
        "q10": "男士说他第一次尝试做饭时就把锅烧焦了，说明他的厨艺还需要提高。故选A。",
        "q11": "女士推荐了一个在线烹饪课程，说有很多视频教程可以跟着学。故选D。",
        "q14": "男士说他已经连续加班三个月了，感觉身心俱疲。故选A。",
    },
}

def fix_explanation_match(explanation, answer):
    """确保解析包含'故选{answer}'"""
    if not explanation:
        return explanation

    # 如果已经有正确的"故选X"，直接返回
    if f'故选{answer}' in explanation:
        return explanation

    # 如果有错误的"故选X"，替换
    if '故选' in explanation:
        explanation = re.sub(r'故选[A-Z]', f'故选{answer}', explanation)
    else:
        # 没有"故选"，添加
        explanation = explanation.rstrip('。') + f'。故选{answer}。'

    return explanation

def main():
    with open(JSON_PATH, 'r', encoding='utf-8') as f:
        data = json.load(f)

    for paper in data:
        pid = paper.get('id')
        updates = EXPLANATION_UPDATES.get(pid, {})

        if not updates:
            continue

        print(f'=== 修复 {pid} 解析 ===')
        fixed = 0

        for section in paper.get('sections', []):
            for q in section.get('questions', []):
                qid = q.get('id')
                answer = q.get('answer', '')

                # 使用更新的解析
                if qid in updates:
                    q['explanation'] = updates[qid]
                    fixed += 1
                else:
                    # 确保解析与答案匹配
                    old_exp = q.get('explanation', '')
                    new_exp = fix_explanation_match(old_exp, answer)
                    if new_exp != old_exp:
                        q['explanation'] = new_exp
                        fixed += 1

        print(f'  修复了 {fixed} 个解析\n')

    with open(JSON_PATH, 'w', encoding='utf-8') as f:
        json.dump(data, f, ensure_ascii=False, indent=2)

if __name__ == '__main__':
    main()
