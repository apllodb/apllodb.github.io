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

### SELECT時の挙動

`SELECT` 対象のテーブルが `t` の場合、(`DROP TABLE` された deactivated ではない) 全バージョンについて、以下のルールに従い処理が行われます。

- **(ルール1)** `SELECT` 文において要求されているテーブル `t` のカラム `c` が、`t` のいずれのバージョンにも存在していなければエラー。
- **(ルール2)** `t` の `c` があるバージョンには存在している場合、そのバージョンのレコードは `c` についてカラム値を返す。
- **(ルール3)** `t` の `c` カラムがあるバージョンには存在している場合、そのバージョンのレコードは `c` についてNULL値を返す。

例を挙げて解説します。
テーブル `t` に、以下の3つのバージョンとレコードが存在する場合を考えます。

```text
v3
| c1 | c2 |
|----|----|
| 1  | 10 |

v2
| c1 | c2 | c3 |
|----|----|----|
| 3  | 30 | 33 |

v1
| c1 |
|----|
| 2  |
```

この時、

```sql
SELECT c4 FROM t;
```

は、ルール1によりエラーとなります (c4 というカラムは存在しない)。

他の例も見てみましょう。

```sql
SELECT c1 FROM t;

-- 結果 (順序は不定)
| c1 |
|----|
| 1  |
| 3  |
| 2  |
```

ルール2が適用されています。

```sql
SELECT c1, c2, c3 FROM t;

-- 結果 (順序は不定)
| c1 | c2   | c3   |
|----|------|------|
| 1  | 10   | NULL |
| 3  | 30   | 33   |
| 2  | NULL | NULL |
```

ルール2とルール3が適用されています。

ここまで Projection (`SELECT` 直後の、取得するカラムの指定) について見ましたが、

- `WHERE`
- `GROUP BY`
- `ORDER BY`
- `JOIN`

に現れるカラム指定についても同じルールが適用されます。
ルール3によってNULLが現れることがありますが、これらの演算には値としてNULLが現れた場合の挙動がSQL標準として定義されており[^1]、その挙動に従って結果を返します。

```sql
SELECT c1, c2, c3 FROM t WHERE c2 > 15;

-- 結果
| c1 | c2   | c3   |
|----|------|------|
| 3  | 30   | 33   |
```

```sql
SELECT c1, c2, c3 FROM t ORDER BY c2 DESC;

-- 結果 (NULLはどの値よりも劣後)
| c1 | c2   | c3   |
|----|------|------|
| 3  | 30   | 33   |
| 1  | 10   | NULL |
| 2  | NULL | NULL |
```

[^1] `GROUP BY nullable_column` などは、RDBMS処理系によってデフォルトの挙動が異なる状況ですが、apllodb v0.1 ではPostgreSQL準拠の意味論を採用しています。

### INSERT時の挙動



## Immutable DDLの実現手法

- RDBの上で作るならこういうテーブルがあればいいよという話
- engine のREADMEから図を引っ張ってくる。

## Immutable DMLの概要

- こっちはバージョンじゃなくてリビジョン。リビジョンはPKごとに付く。
- INSERT すると リビジョン1。UPDATE, DELETEでリビジョン増える

## Immutable DMLの実現手法

- engine のREADMEから図を引っ張ってくる。
- もしかしたらDDLの時点で説明終わってるかも
