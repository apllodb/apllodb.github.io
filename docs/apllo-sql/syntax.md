---
sidebar_position: 1
---

# APLLO SQL の構文

APLLO SQLの構文は、 [apllo_sql.pest](https://github.com/darwin-education/apllo/blob/master/apllo-sql-parser/src/pest_grammar/apllo_sql.pest) を正とする。
このファイルはPEG (Parsing expression grammars) 形式で記載されており、機会にとって解釈のブレなくパースできるだけでなく、人間にとっても厳密で読みやすいフォーマットになっている。
PEGの読み方については <https://pest.rs/book/grammars/syntax.html> を参照のこと。

構文にはImmutable Schemaに特徴的な要素（バージョンなど）が現れず、通常のSQLに類似していることに注意。
Immutable Schemaの特色はAPLLO SQLで明示的に表現されることはなく、透過的に実行される。あるAPLLO SQLがどのように処理されるかは、この後の意味論についてのドキュメントを参照。
