---
sidebar_position: 3
slug: /ImmutableSchema/
---

# Immutable Schema

[イントロダクション](02-introduction.md) で述べたように、Immutable SchemaはImmutable DDLとImmutable DMLから成ります。
Immutable Schemaは、デジタル資料管理のために既に追加したデータ（レコード）を破壊せず、データの観察により得られた新たな情報の整理を可能にします。

この章ではImmutable DDLとImmutable DMLの仕様と、v0.1 における実装手法について説明します。

## Immutable DDLの概要

通常のRDBMSのDDLでは、 `CREATE TABLE` 文で作成したテーブル定義を `ALTER TABLE` 文で修正したり、 `DROP TABLE` 文で削除したりすることができます。
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

`INSERT` 対象のテーブルが `t` の場合、(`DROP TABLE` された deactivated ではない) 全バージョンについて、以下のルールに従い処理が行われます。

- **(ルール1)** バージョンを降順に見て、 `INSERT` 文による挿入がそのバージョンについて正常に実行できるならば、そのバージョンへのレコード挿入を試みる。
  - **(ルール1.1)** テーブル全体の制約に違反した場合はエラー。
  - **(ルール1.2)** さもなくばそのバージョンへの挿入が正常に完了。
- **(ルール2)** ルール1であるバージョンについて正常に実行できなければ、より小さいバージョンを選び繰り返す。
- **(ルール3)** `v1` への挿入も正常に完了しなかった場合、 `INSERT` 文の実行がエラーとなる。

例を挙げて解説します。
テーブル `t` に、以下の3つのバージョンと、テーブル全体の制約が存在する場合を考えます。

- v3
  - `c1`: NOT NULL
  - `c2`: NOT NULL
- v2
  - `c1`: NOT NULL
  - `c2`: NOT NULL
  - `c3`: NULL
- v1
  - `c1`: NOT NULL
- テーブル全体の制約
  - `id`: PRIMARY KEY

この場合にいくつかの `INSERT` 文とその結果を見てみます。

```sql
INSERT INTO t (c1, c2) VALUES (1, 10);
```

ルール1に従い、まず `v3` への挿入を試みます。`v3` への挿入は問題なくできるので、ルール1.2によりINSERT文は正常完了します。
（`v2` への挿入も可能ですが、バージョンの大きい順から挿入候補となるので、 `v2` は選ばれません。）

```sql
INSERT INTO t (c1, c2, c3) VALUES (3, 30, 33);
```

ルール1に従い、まず `v3` への挿入を試みます。`v3` には `c3` というカラムがないので、ルール2へ移行し、`v2` を試みる形でルール1へ戻ります。
`v2` への挿入は問題なくできるので、ルール1.2によりINSERT文は正常完了します。

```sql
INSERT INTO t (c1) VALUES (2);
```

`v3`, `v2` ともに `c2` を要求するため、失敗します。`v1` へ至り正常完了します。

```sql
INSERT INTO t (c4) VALUES (4);
```

`v3`, `v2`, `v1` のいずれも `c4` を持たないので、ルール3により、このINSERT文はエラーとなります。

```sql
INSERT INTO t (c1, c2, c3) VALUES (1, 100, 111);
```

`v3` は `c3` を持たないので `v2` への挿入を試みます。
`c1 = 1` であるレコードは既に存在するので、テーブル全体の制約である `c1 PRIMARY KEY` に違反します。従ってルール1.1により、このINSERT文はエラーとなります。

## Immutable DMLの概要

通常のRDBMSのDMLでは、 `INSERT` 文で作成したレコードを `UPDATE` 文で更新したり、 `DELETE` 文で削除したりすることができます。
`UPDATE` や `DELETE` でレコードが更新（削除）されると、元のレコードは復旧できません[^2]。

Immutable DMLでは、レコードが **リビジョン** を持ち、以前のリビジョンへの復旧を可能にします。

- テーブルは必ずプライマリキーを持ち、プライマリキーはどのバージョンも共通。
- プライマリキーとリビジョンは1対多対応。
- あるプライマリキーの値が `INSERT` 文により初めて現れた時、そのレコードは `r1` のリビジョンになる。
- そのプライマリキーのレコードが `UPDATE` 文により更新された時、 `r1` のレコードはそのまま残り、`r2` のレコードが追記の形で（内部的には `INSERT` 処理が走る形で）作成される。
- 同じプライマリキーのレコードが `DELETE` 文により削除された時、 `r3` のレコードが、削除マークのみで中身はない形で作成される。
- `SELECT` においては、同じプライマリキーの中の最新リビジョンのみが取得される。最新リビジョンに削除マークが付いていたら、そのプライマリキーのレコードは取得対象にならない。

`UPDATE` の場合の挙動を図解します。

![`UPDATE`](/img/immutable-dml-update.ja.png)

_[『apllodbの構想』スライド](https://docs.google.com/presentation/d/e/2PACX-1vRqJ5GmC6T9VaJ_CCujsd0dkqN4883DR9S4T3eYI5wxF7_vzNhbscW-StclxjkeMT3eCIVdKEVGQslT/pub?start=false&loop=false&delayms=3000)より引用_

通常のRDBMSでは、`c1` の値が `UPDATE` で上書きされるため、通常元の値に戻すことはできません[^3]。
デジタル資料管理においては、レコードを修正・削除前に戻したくなることが多いと考えます。
Immutable DMLでは、過去のレコードもリビジョンの形で残っているため、必要に応じて復旧することが可能です。また、あるレコードの変更履歴を抽出することも可能です。
このようなレコード単位の復旧や履歴閲覧は、通常はアプリケーション層で実現されることが多いですが、デジタル資料管理に特化した apllodb ではデータベース層でこの機能を実現します。

[^2] 一部のRDBMSでは、UPDATEやDELETEのような破壊的なDMLを、Immutable DMLのように追記型で行っています。そのうちの多くは、何かのタイミング（バックグラウンド処理や `VACUUM` コマンドなど）でガーベージコレクションを実行し、破壊的なDMLを完了させます。容量削減やパフォーマンス向上の狙いがあります。

[^3] スナップショットのバックアップがある場合などは可能ですが、レコードごとの復旧をサポートしているシステムはあまりないかと思います。

## Immutable DDL, Immutable DMLの実現手法

- 0.1 は SQLite ベースで作っとるよ
- RDBの上で作るならこういうテーブルがあればいいよという話
- engine のREADMEから図を引っ張ってくる。
