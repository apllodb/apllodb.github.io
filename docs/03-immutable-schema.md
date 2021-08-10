---
sidebar_position: 3
slug: /ImmutableSchema/
---

# Immutable Schema

[イントロダクション](02-introduction.md) で述べたように、Immutable SchemaはImmutable DDLとImmutable DMLから成ります。
Immutable Schemaは、デジタル資料管理のために既に追加したデータ（レコード）を破壊せず、データの観察により得られた新たな情報の整理を可能にします。

この章ではImmutable DDLとImmutable DMLの仕様と、v0.1 における実装手法について説明します。

## Immutable DDLの概要

通常のDDLでは、 `CREATE TABLE` 文で作成したテーブル定義を `ALTER TABLE` 文で修正したり、 `DROP TABLE` 文で削除したりすることができます。
`ALTER TABLE` や `DROP TABLE` でテーブル定義が変更（削除）されると、元のテーブル定義は復旧できません。

これを可能にするのがImmutable DDLです。
Immutable DDLにおいては、テーブルが **バージョン** を持ちます。

- `CREATE TABLE t ...` により、テーブル `t` の `v1` が作成される。
- 続いて `ALTER TABLE t ...` をすると、テーブル `t` の `v2` が作成される。`v1` のテーブル定義と `v1` に紐づくレコードは、そのまま残る。
- 続いて `DROP TABLE t` をすると、テーブル `t` の `v3` が作成される。 `v3` は deactivated 状態であり、 `t` に対する操作は原則エラーになる。`v1`, `v2` に紐づくレコードはそのまま残っている。

`ALTER TABLE` の場合の挙動を図解します。

![`ALTER TABLE ... ADD`](/img/immutable-ddl-alter-table-add.ja.png)

_[『apllodbの構想』スライド](https://docs.google.com/presentation/d/e/2PACX-1vRqJ5GmC6T9VaJ_CCujsd0dkqN4883DR9S4T3eYI5wxF7_vzNhbscW-StclxjkeMT3eCIVdKEVGQslT/pub?start=false&loop=false&delayms=3000)より引用_

まずは `ADD COLUMN` ですが、デフォルト値がなく、かつ `NOT NULL` であるカラム追加は、通常のRDBMSではできません。
既存レコードの新しいカラムにセットすべき値が決まらないためです。
Immutable DDLでは、カラム追加前のテーブル定義が `v1` として残り、レコードも `v1` に紐付いて保持されるため、エラーなく `v2` ができます。
次回以降のINSERTは、追加カラムに対しても値をセットしていれば、 `v2` に向きます。

続いて `DROP COLUMN` の例を見ます。

![`ALTER TABLE ... DROP`](/img/immutable-ddl-alter-table-drop.ja.png)

_[『apllodbの構想』スライド](https://docs.google.com/presentation/d/e/2PACX-1vRqJ5GmC6T9VaJ_CCujsd0dkqN4883DR9S4T3eYI5wxF7_vzNhbscW-StclxjkeMT3eCIVdKEVGQslT/pub?start=false&loop=false&delayms=3000)より引用_

通常のRDBMSでは、既存レコードからカラムの値も消えてしまいます。
これは何らおかしい挙動ではないのですが、デジタル資料管理においては「今後はこのカラムもう入力しないで良いけど、今まで入力したカラム値はせっかくだから残していたい」というケースがあると考えます。
その場合にもImmutable DDLは役立ちます。カラムをテーブル定義から削除しても、 `v1` にはカラム削除前のテーブル定義とレコードがそのまま残るからです。

ここまでで、DDLを発行するとテーブル定義の中にバージョンができあがり、レコードも古いバージョンに紐づく形でそのまま残ることを説明しました。
次の説では、複数のバージョンが存在する状況で、 `SELECT` や `INSERT` などのDMLがどのような挙動となるかを説明します。

## Immutable DDLの詳細

- INSERT 時にどのバージョンが選ばれるか
- SELECT 時にどのバージョンが選ばれるか（簡単のため、revisionは一つだけとする）
  - projection 指定と比べて欠損しているカラムはどうするか -> NULL
  - NULL にしておけばいいの？ -> 良いんです。selection, projection, sort, aggr, join

## Immutable DDLの実現手法

- RDBの上で作るならこういうテーブルがあればいいよという話
- engine のREADMEから図を引っ張ってくる。

## Immutable DMLの概要

- こっちはバージョンじゃなくてリビジョン。リビジョンはPKごとに付く。
- INSERT すると リビジョン1。UPDATE, DELETEでリビジョン増える

## Immutable DMLの実現手法

- engine のREADMEから図を引っ張ってくる。
- もしかしたらDDLの時点で説明終わってるかも
