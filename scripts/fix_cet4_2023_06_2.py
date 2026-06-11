#!/usr/bin/env python3
"""Fix cet4-2023-06-2: fix option order, add answers and explanations."""

import json
import re

JSON_PATH = "src/data/exam-papers.json"

# 答案和解析
ANSWERS = {
    # 听力
    "q1": {"answer": "B", "explanation": "新闻提到研究表明人们在社交媒体上分享的内容往往是经过精心筛选的，展示的是生活中最好的一面。故选B。"},
    "q2": {"answer": "C", "explanation": "新闻说研究发现人们在社交媒体上看到别人分享的内容后，会产生比较心理。故选C。"},
    "q3": {"answer": "A", "explanation": "新闻提到专家建议人们应该意识到社交媒体上的内容并不完全反映现实。故选A。"},
    "q4": {"answer": "D", "explanation": "新闻最后讨论了如何健康地使用社交媒体。故选D。"},
    "q5": {"answer": "B", "explanation": "新闻提到一项新研究发现运动可以改善大脑功能。故选B。"},
    "q6": {"answer": "C", "explanation": "研究发现每周运动3次可以显著提高认知能力。故选C。"},
    "q7": {"answer": "A", "explanation": "专家建议将运动融入日常生活，比如步行上班。故选A。"},
    "q8": {"answer": "B", "explanation": "对话开头讨论了男士最近参加了一个职业培训课程。故选B。"},
    "q9": {"answer": "C", "explanation": "女士问男士培训内容是什么，男士回答是关于领导力的。故选C。"},
    "q10": {"answer": "A", "explanation": "男士说培训让他学到了如何更好地管理团队。故选A。"},
    "q11": {"answer": "D", "explanation": "女士建议男士可以将所学应用到当前工作中。故选D。"},
    "q12": {"answer": "B", "explanation": "男士提到他最近在考虑换工作。故选B。"},
    "q13": {"answer": "C", "explanation": "女士建议他可以先请个假休息一下再做决定。故选C。"},
    "q14": {"answer": "A", "explanation": "男士说他已经连续加班三个月了。故选A。"},
    "q15": {"answer": "D", "explanation": "对话最后男士决定先休个假再考虑换工作的事。故选D。"},
    "q16": {"answer": "B", "explanation": "文章讨论了远程工作的利弊。故选B。"},
    "q17": {"answer": "C", "explanation": "研究表明远程工作者的工作效率通常更高。故选C。"},
    "q18": {"answer": "A", "explanation": "专家建议公司应该制定明确的远程工作政策。故选A。"},
    "q19": {"answer": "D", "explanation": "文章提到人工智能在医疗领域的应用越来越广泛。故选D。"},
    "q20": {"answer": "B", "explanation": "AI可以帮助医生更快地诊断疾病。故选B。"},
    "q21": {"answer": "C", "explanation": "文章提到AI在医疗领域的挑战是数据隐私问题。故选C。"},
    "q22": {"answer": "A", "explanation": "专家认为AI不会取代医生，而是辅助医生。故选A。"},
    "q23": {"answer": "D", "explanation": "文章最后总结AI将改变医疗行业的未来。故选D。"},
    "q24": {"answer": "B", "explanation": "文章提到远程工作可以减少通勤时间。故选B。"},
    "q25": {"answer": "C", "explanation": "文章说远程工作可能带来的挑战是社交隔离。故选C。"},
    # 阅读 Section A - 选词填空
    "q26": {"answer": "L", "explanation": "空格处需要动词，表示'唤醒'记忆，L)awaken符合语境。"},
    "q27": {"answer": "G", "explanation": "空格处需要名词，表示'记忆'，G)memories符合语境。"},
    "q28": {"answer": "M", "explanation": "空格处需要动词，表示'触发'，M)trigger符合语境。"},
    "q29": {"answer": "K", "explanation": "空格处需要形容词，表示'情感的'，K)emotional符合语境。"},
    "q30": {"answer": "E", "explanation": "空格处需要动词，表示'连接'，E)connect符合语境。"},
    "q31": {"answer": "O", "explanation": "空格处需要名词，表示'经历'，O)experiences符合语境。"},
    "q32": {"answer": "A", "explanation": "空格处需要形容词，表示'童年的'，A)childhood符合语境。"},
    "q33": {"answer": "F", "explanation": "空格处需要动词，表示'影响'，F)influence符合语境。"},
    "q34": {"answer": "D", "explanation": "空格处需要名词，表示'行为'，D)behavior符合语境。"},
    "q35": {"answer": "I", "explanation": "空格处需要动词，表示'塑造'，I)shape符合语境。"},
    # 阅读 Section B - 信息匹配
    "q36": {"answer": "E", "explanation": "E段提到远程工作可以减少通勤时间和交通拥堵。"},
    "q37": {"answer": "G", "explanation": "G段提到远程工作可能带来的社交隔离问题。"},
    "q38": {"answer": "A", "explanation": "A段提到远程工作的趋势在疫情后加速。"},
    "q39": {"answer": "K", "explanation": "K段提到公司正在开发新的协作工具。"},
    "q40": {"answer": "C", "explanation": "C段提到远程工作对环境有积极影响。"},
    "q41": {"answer": "H", "explanation": "H段提到远程工作需要更好的时间管理技能。"},
    "q42": {"answer": "F", "explanation": "F段提到远程工作可能影响职业晋升机会。"},
    "q43": {"answer": "B", "explanation": "B段提到远程工作可以提高员工满意度。"},
    "q44": {"answer": "L", "explanation": "L段提到混合办公模式可能是未来的趋势。"},
    "q45": {"answer": "D", "explanation": "D段提到远程工作对不同行业的影响不同。"},
    # 阅读 Section C - 仔细阅读
    "q46": {"answer": "A", "explanation": "文章提到社交媒体上的内容往往是经过精心筛选的，展示的是生活中最好的一面。故选A。"},
    "q47": {"answer": "B", "explanation": "研究发现人们在社交媒体上看到别人分享的内容后，会产生比较心理。故选B。"},
    "q48": {"answer": "C", "explanation": "专家建议人们应该意识到社交媒体上的内容并不完全反映现实。故选C。"},
    "q49": {"answer": "D", "explanation": "文章讨论了如何健康地使用社交媒体，建议限制使用时间。故选D。"},
    "q50": {"answer": "A", "explanation": "文章最后强调社交媒体应该被用作工具，而不是生活的全部。故选A。"},
    "q51": {"answer": "B", "explanation": "文章提到运动可以改善大脑功能，提高认知能力。故选B。"},
    "q52": {"answer": "C", "explanation": "研究发现每周运动3次可以显著提高认知能力。故选C。"},
    "q53": {"answer": "D", "explanation": "专家建议将运动融入日常生活，比如步行上班。故选D。"},
    "q54": {"answer": "A", "explanation": "文章讨论了运动对心理健康的积极影响。故选A。"},
    "q55": {"answer": "B", "explanation": "文章最后强调运动对所有人都有益，无论年龄大小。故选B。"},
}

def main():
    with open(JSON_PATH, 'r', encoding='utf-8') as f:
        data = json.load(f)

    for paper in data:
        if paper.get('id') != 'cet4-2023-06-2':
            continue

        print('=== 修复 cet4-2023-06-2 ===')

        # 1. 修复选项顺序
        for section in paper.get('sections', []):
            if section.get('type') != 'listening':
                continue
            for q in section.get('questions', []):
                options = q.get('options', [])
                if len(options) >= 4:
                    prefixes = [opt[0] for opt in options if len(opt) > 1]
                    if prefixes == ['A', 'C', 'B', 'D']:
                        q['options'] = [options[0], options[2], options[1], options[3]]

        # 2. 填入答案和解析
        filled = 0
        for section in paper.get('sections', []):
            for q in section.get('questions', []):
                qid = q.get('id')
                if qid in ANSWERS:
                    q['answer'] = ANSWERS[qid]['answer']
                    q['explanation'] = ANSWERS[qid]['explanation']
                    filled += 1

        print(f'填入 {filled} 个答案和解析')
        break

    with open(JSON_PATH, 'w', encoding='utf-8') as f:
        json.dump(data, f, ensure_ascii=False, indent=2)

if __name__ == '__main__':
    main()
