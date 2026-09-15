# 知识学堂公开页面

本目录是 AI×ESG 工作台知识学堂在 GitHub Pages 上发布的静态页面。页面定位为方法论拆解、知识关联与可视化解读，不设计学习进度、已读状态或课程完成引导。

第一期入口包含 MSCI、A股、港交所和 CSA 四套内容。MSCI 已迁移完整的 33 个关键议题正文，并提供方法论总览、评级流程和行业权重映射；其余三套目前保留结构摘要，后续按原始资料核验结果继续补充。

页面不会发布客户资料、账号信息、工作台运行数据或本地配置。正式工作应回到对应机构或交易所的现行原文核对。

重新生成公开数据：

```bash
node scripts/build_knowledge_pages.cjs
```

本地预览：

```bash
python3 -m http.server 18900 --bind 127.0.0.1 --directory knowledge-pages
```

发布地址：<https://707292385-byte.github.io/aiesg-workbench-downloads/academy/>
