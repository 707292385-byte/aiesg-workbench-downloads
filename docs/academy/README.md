# 知识学堂公开页面

本目录是 AI×ESG 工作台知识学堂在 GitHub Pages 上发布的静态页面。第一期包含 MSCI、A股、港交所和 CSA 四套学习路径。

页面只发布个人整理的学习目录、结构摘要、关系卡片、版本说明和官方资料入口，不发布本地保存的完整原文、客户资料、账号信息或工作台运行数据。正式工作应回到对应机构或交易所的现行原文核对。

重新生成公开数据：

```bash
node scripts/build_knowledge_pages.cjs
```

本地预览：

```bash
python3 -m http.server 18900 --bind 127.0.0.1 --directory knowledge-pages
```

发布地址：<https://707292385-byte.github.io/aiesg-workbench-downloads/academy/>
