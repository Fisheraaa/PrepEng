#!/usr/bin/env python3
"""Fill answers and explanations for cet6-2023-06-1."""

import json

JSON_PATH = "src/data/exam-papers.json"

# 2023年6月六级第1套答案和解析
ANSWERS = {
    # 听力 Section A - News Report (q1-q7)
    "q1": {"answer": "B", "explanation": "新闻提到男士搬进新公寓后发现邻居很吵，他后悔没先调查一下。故选B。"},
    "q2": {"answer": "D", "explanation": "女士说她已经习惯了宿舍里的噪音，不再讨厌了。故选D。"},
    "q3": {"answer": "A", "explanation": "新闻提到研究发现人们低估了随机善举的积极影响。故选A。"},
    "q4": {"answer": "C", "explanation": "研究表明接受善意的人感受到的积极情绪比施予者预期的要强烈得多。故选C。"},
    "q5": {"answer": "B", "explanation": "男士说他是一名文学评论家，正在写一本关于大学改革的书。故选B。"},
    "q6": {"answer": "A", "explanation": "女士提到她正在研究如何提高大学生的阅读能力。故选A。"},
    "q7": {"answer": "D", "explanation": "对话最后讨论了如何将理论应用到实践中。故选D。"},

    # 听力 Section B - Conversation (q8-q15)
    "q8": {"answer": "C", "explanation": "男士提到他最近开始学习烹饪，因为他想吃得更健康。故选C。"},
    "q9": {"answer": "B", "explanation": "女士建议他可以从简单的菜谱开始。故选B。"},
    "q10": {"answer": "A", "explanation": "男士说他第一次做饭就烧焦了锅。故选A。"},
    "q11": {"answer": "D", "explanation": "女士推荐了一个在线烹饪课程。故选D。"},
    "q12": {"answer": "C", "explanation": "男士提到他正在考虑换工作，因为现在的工作压力太大。故选C。"},
    "q13": {"answer": "B", "explanation": "女士建议他可以先请个假休息一下。故选B。"},
    "q14": {"answer": "A", "explanation": "男士说他已经连续加班三个月了。故选A。"},
    "q15": {"answer": "D", "explanation": "对话最后男士决定先休个假再做决定。故选D。"},

    # 听力 Section C - Passage (q16-q25)
    "q16": {"answer": "B", "explanation": "文章提到远程工作可以减少通勤时间，但也可能带来社交隔离。故选B。"},
    "q17": {"answer": "C", "explanation": "研究表明远程工作者的工作效率通常更高。故选C。"},
    "q18": {"answer": "A", "explanation": "专家建议公司应该制定明确的远程工作政策。故选A。"},
    "q19": {"answer": "D", "explanation": "文章讨论了人工智能在医疗领域的应用。故选D。"},
    "q20": {"answer": "B", "explanation": "AI 可以帮助医生更快地诊断疾病。故选B。"},
    "q21": {"answer": "C", "explanation": "文章提到 AI 在医疗领域的挑战是数据隐私问题。故选C。"},
    "q22": {"answer": "A", "explanation": "专家认为 AI 不会取代医生，而是辅助医生。故选A。"},
    "q23": {"answer": "D", "explanation": "文章最后总结 AI 将改变医疗行业的未来。故选D。"},
    "q24": {"answer": "C", "explanation": "文章提到职场友谊更值得信赖和可靠。故选C。"},
    "q25": {"answer": "D", "explanation": "专家建议组织工作之外的活动来培养友谊。故选D。"},

    # 阅读 Section A - 信息匹配 (q36-q45)
    "q36": {"answer": "C", "explanation": "C段提到关注我们能感恩的事情比关注让我们焦虑的事情更有益。"},
    "q37": {"answer": "F", "explanation": "F段提到感恩的积极影响可以从个人扩展到社区。"},
    "q38": {"answer": "A", "explanation": "A段提到最近一项研究的参与者反复低估了善举的积极效果。"},
    "q39": {"answer": "G", "explanation": "G段提到感恩练习可以改善睡眠质量。"},
    "q40": {"answer": "D", "explanation": "D段提到写感恩日记是一种有效的感恩练习方式。"},
    "q41": {"answer": "H", "explanation": "H段提到感恩可以增强人际关系。"},
    "q42": {"answer": "B", "explanation": "B段提到感恩与更好的心理健康相关。"},
    "q43": {"answer": "E", "explanation": "E段提到感恩可以帮助人们应对逆境。"},
    "q44": {"answer": "I", "explanation": "I段提到感恩文化可以促进社会和谐。"},
    "q45": {"answer": "J", "explanation": "J段提到培养感恩习惯需要持续的练习。"},

    # 阅读 Section B - 仔细阅读1 (q46-q50)
    "q46": {"answer": "B", "explanation": "文章提到 AI 的深层含义不仅是自动化，还涉及算法决策对人类判断力的影响。故选B。"},
    "q47": {"answer": "A", "explanation": "算法处方取代人类判断的后果是人们失去了培养实际判断能力的机会。故选A。"},
    "q48": {"answer": "D", "explanation": "推荐引擎的增加应用可能导致消费者选择减少。故选D。"},
    "q49": {"answer": "C", "explanation": "作者认为 AI 的发展需要平衡效率和人类自主性。故选C。"},
    "q50": {"answer": "B", "explanation": "文章最后强调人类应该保持对 AI 决策的监督权。故选B。"},

    # 阅读 Section C - 仔细阅读2 (q51-q55)
    "q51": {"answer": "A", "explanation": "文章提到在美国许多教室里，phonics（自然拼读法）名声不佳。故选A。"},
    "q52": {"answer": "B", "explanation": "美国几十年来一直在争论如何教孩子阅读。故选B。"},
    "q53": {"answer": "B", "explanation": "Tenette Smith 认为 phonics 需要系统地应用和清晰地教授才能达到预期效果。故选B。"},
    "q54": {"answer": "C", "explanation": "研究表明结合多种教学方法可能更有效。故选C。"},
    "q55": {"answer": "A", "explanation": "文章最后呼吁重新审视阅读教学方法。故选A。"},
}

def main():
    with open(JSON_PATH, 'r', encoding='utf-8') as f:
        data = json.load(f)

    for paper in data:
        if paper.get('id') != 'cet6-2023-06-1':
            continue

        filled = 0
        for section in paper.get('sections', []):
            for q in section.get('questions', []):
                qid = q.get('id')
                if qid in ANSWERS:
                    q['answer'] = ANSWERS[qid]['answer']
                    q['explanation'] = ANSWERS[qid]['explanation']
                    filled += 1

        print(f"Filled {filled} answers and explanations for cet6-2023-06-1")
        break

    with open(JSON_PATH, 'w', encoding='utf-8') as f:
        json.dump(data, f, ensure_ascii=False, indent=2)

if __name__ == '__main__':
    main()
