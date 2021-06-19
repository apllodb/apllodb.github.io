---
sidebar_position: 3
---

# Immutable DDL - 概念編

TODO 以前の章からモチベーションを再掲

ここでは、Immutable DDL が有効な世界において SQL を発行すると内部的に何が起こり、SQLを発行した人はどのような結果を得られるのかを概念的に記載します。

より厳密な詳細は [Immutable DDL - 詳細仕様編](immutable-ddl-specification) を参照してください。

## 具体例から Immutable DDL の挙動を知る

顧客リストを RDBMS のテーブルとして管理する事例を考えてみます。
特に、apllodb が得意とする「テーブル定義に試行錯誤できる」という性質をハイライトするため、あえてテーブル定義に四苦八苦するシナリオを考えます。

まずは通常の RDBMS で四苦八苦してみて、顧客リストはどんな状態になってしまうかを見てみます。

ここでは概念を掴むことが目的なので、ここで記載したSQLが厳密に apllodb で利用できることは保証しません。

### 普通の RDBMS の場合

なにはともあれテーブルを作っていきます。顧客の情報としては「ID」「名前」「年齢」「性別」あたりをとることにしました。

```sql title="最初のテーブル定義"
CREATE TABLE customers (
    id BIGINT NOT NULL,
    name TEXT NOT NULL,
    age SMALLINT NOT NULL,
    gender SMALLINT NOT NULL,
);
```

性別は数値で管理し、プログラム側で表示し分ける想定です。
これで実際に、既存顧客のレコードを入れていきます。

```sql title="既存顧客のINSERT"
INSERT INTO customers (id, name, age, gender) VALUES
  (1, "Koji Taura", 48, 1),
  (2, "Mika Kikuchi", 21, 2);
```

| id  | name           | age | gender |
| --- | -------------- | --- | ------ |
| 1   | "Koji Taura"   | 48  | 1      |
| 2   | "Mika Kikuchi" | 21  | 2      |

ここで、今後のマーケティングのために顧客が住んでいる地域もテーブルで管理したくなったとします。
幸い既存の2名はダイレクトマーケティングで獲得した顧客なので、住んでいる地域は東京と大阪だと把握しています。

ではテーブル定義を変更しましょう。

```sql title="living_area カラムを追加（失敗）"
ALTER TABLE customers
  ADD living_area TEXT NOT NULL;
```

...おっと。RDBMSからエラーが返ってきました。
「既存レコードのデフォルト値がわからないので NOT NULL なカラムは追加できない」とのこと。言われてみればたしかにそうですね。
仕方がないので一旦 NULLABLE でカラムを追加します。

```sql title="living_area カラムを NULLABLE で追加（成功）"
ALTER TABLE customers
  ADD living_area TEXT;
```

これでカラム追加に成功しました。

| id  | name           | age | gender | living_area (NULL) |
| --- | -------------- | --- | ------ | ------------------ |
| 1   | "Koji Taura"   | 48  | 1      | NULL               |
| 2   | "Mika Kikuchi" | 21  | 2      | NULL               |

早速既存の2名の住んでいる地域を埋めておきましょう。

```sql title="living_area カラムを埋める"
UPDATE customers
  SET living_area = "Tokyo"
  WHERE id = 1;

UPDATE customers
  SET living_area = "Osaka"
  WHERE id = 2;
```

| id  | name           | age | gender | living_area (NULL) |
| --- | -------------- | --- | ------ | ------------------ |
| 1   | "Koji Taura"   | 48  | 1      | "Tokyo"            |
| 2   | "Mika Kikuchi" | 21  | 2      | "Osaka"            |

顧客獲得は順調で、もうひとり分レコードが入ってきました。システムからこんなSQLが送られてきます。

```sql title="living_area 指定のないレコードの INSERT"
INSERT INTO customers (id, name, age, gender) VALUES
  (3, "Kanae Satouchi", 32, 2);
```

| id  | name             | age | gender | living_area (NULL) |
| --- | ---------------- | --- | ------ | ------------------ |
| 1   | "Koji Taura"     | 48  | 1      | "Tokyo"            |
| 2   | "Mika Kikuchi"   | 21  | 2      | "Osaka"            |
| 3   | "Kanae Satouchi" | 32  | 2      | NULL               |

あれ？ `living_area` カラムがセットされてないですね...
そうです。顧客を登録するシステム側の修正が完了するまでは `living_area` カラムがないレコードが INSERT され続けるのです。

これはいけないと慌てたあなたは、 `living_area` カラムを NOT NULL に変更します！

```sql title="living_area を NOT NULL に修正"
--- ID=3 の住んでいる地域も知っていたので埋める
UPDATE customers
  SET living_area = "Tokyo"
  WHERE id = 3;

ALTER TABLE customers
  MODIFY living_area TEXT NOT NULL;
```

| id  | name             | age | gender | living_area |
| --- | ---------------- | --- | ------ | ----------- |
| 1   | "Koji Taura"     | 48  | 1      | "Tokyo"     |
| 2   | "Mika Kikuchi"   | 21  | 2      | "Osaka"     |
| 3   | "Kanae Satouchi" | 32  | 2      | "Tokyo"     |

テーブルはきれいになりました。しかし顧客登録システムからアラートが鳴っています！

```sql title="顧客登録システムが発行したSQL（エラー）"
INSERT INTO customers (id, name, age, gender) VALUES
  (4, "Noriyuki Tajima", 51, 1);
```

そうです。まだシステム側の修正が完了していないので、 `living_area` が空のINSERTが発行され続けるのです...
顧客登録システムをメンテナンスモードに切り替え、アップデートし、なんとか最新のテーブル定義に追いつかせました。
新しい顧客も無事登録されました。

```sql title="顧客登録システムがアップデート後に発行したSQL（成功）"
INSERT INTO customers (id, name, age, gender, living_area) VALUES
  (4, "Noriyuki Tajima", 51, 1, "Osaka");
```

| id  | name              | age | gender | living_area |
| --- | ----------------- | --- | ------ | ----------- |
| 1   | "Koji Taura"      | 48  | 1      | "Tokyo"     |
| 2   | "Mika Kikuchi"    | 21  | 2      | "Osaka"     |
| 3   | "Kanae Satouchi"  | 32  | 2      | "Tokyo"     |
| 4   | "Noriyuki Tajima" | 51  | 1      | "Osaka"     |

さて、サービスも軌道に乗ってきて登録者数もどんどん増えてきました :tada:

| id   | name            | gender | living_area |
| ---- | --------------- | ------ | ----------- |
| 1    | "Koji Taura"    | 1      | "Tokyo"     |
| ...  | ...             | ...    | ...         |
| 1000 | "Yukino Kimura" | 29     | "Kyoto"     |

そんなときに上司からこんなことを言われます。

「今は性別の取得とかセンシティブな時代だからテーブルから消しておいて。」

あなたはちょっと心配しつつも、指示通りにカラムを削除します。もちろん今度は先にシステム側が `gender` カラムを見なくなるようにアップデートしてから。

```sql title="gender カラムの削除"
ALTER TABLE customers
  DROP gender;
```

| id   | name            | living_area |
| ---- | --------------- | ----------- |
| 1    | "Koji Taura"    | "Tokyo"     |
| ...  | ...             | ...         |
| 1000 | "Yukino Kimura" | "Kyoto"     |

3日後、また上司があなたの元にやってきました。

「そろそろマーケティング用の分析を始めていきたい。まずは性別ごとの購買傾向を見たいな。」

え、性別はこの前削除しましたよね？

「ああ、たしかに... 取得済みの人たちの性別だけでいいから、今からでも戻せない？」

... なんということでしょう。データベース管理者と相談して、バックアップが今からでも参照できるか相談です。

### apllodb の場合

あなたが使っているのが Immutable DDL 機能を持つ apllodb だとどうなるでしょうか。
テーブルを最初に作るところは同じです。

```sql title="最初のテーブル定義"
CREATE TABLE customers (
    id BIGINT NOT NULL,
    name TEXT NOT NULL,
    age SMALLINT NOT NULL,
    gender SMALLINT NOT NULL,
);
```

```sql title="既存顧客のINSERT"
INSERT INTO customers (id, name, age, gender) VALUES
  (1, "Koji Taura", 48, 1),
  (2, "Mika Kikuchi", 21, 2);
```

| id  | name           | age | gender |
| --- | -------------- | --- | ------ |
| 1   | "Koji Taura"   | 48  | 1      |
| 2   | "Mika Kikuchi" | 21  | 2      |

さて、住んでいる地域もテーブルに追加することになりました。
普通の RDBMS だと NOT NULL での追加は（デフォルト値を指定しない限り）できないので、NULLABLE で追加することになりましたが、 apllodb では NOT NULL での追加が可能です！

```sql title="living_area カラムを追加（成功）"
ALTER TABLE customers
  ADD living_area TEXT NOT NULL;
```

テーブルはどのような状態になるでしょうか？

| id  | name           | age | gender | living_area (MAY NULL) |
| --- | -------------- | --- | ------ | ----------------------- |
| 1   | "Koji Taura"   | 48  | 1      | NULL                    |
| 2   | "Mika Kikuchi" | 21  | 2      | NULL                    |

NOT NULL で `living_area` を追加したはずなのに、NULL 値が入っていますね。
よく見るとカラムに `MAY NULL` という属性がついています。

これは「SELECTした際には `living_area` の値がNULLになっているかもしれないし、次回以降INSERT, UPDATEするレコードの `living_area` カラムはNULLでも許容されるが、INSERT, UPDATEの際にNULL値は推奨されない」という意味合いです。

現時点の apllodb では単なる非推奨勧告のような機能ですが、思想としては「人間が今後入れるデータは ALTER TABLE 時の宣言通り NOT NULL。ただし古いシステムから NULL 値が入り続けることは許容する」というものです。

将来のバージョンにおいて:

- MAY NULL カラムに NULL をセットした際にクライアントに警告を伝播。
- 既存レコードの MAY NULL カラムに NULL 値が1つもなくなった際に、NOT NULL に制約を強める提案を RDBMS からクライアントに送る。
  - まだ既存システムから NULL 値での INSERT が入る可能性が否定できないので、提案に留まる。

などの拡張を検討しています。

さて、先程のシナリオ通り、この時点で既存顧客の住んでいる地域を埋めておきます。

```sql title="living_area カラムを埋める"
UPDATE customers
  SET living_area = "Tokyo"
  WHERE id = 1;

UPDATE customers
  SET living_area = "Osaka"
  WHERE id = 2;
```

| id  | name           | age | gender | living_area (MAY NULL) |
| --- | -------------- | --- | ------ | ----------------------- |
| 1   | "Koji Taura"   | 48  | 1      | "Tokyo"                 |
| 2   | "Mika Kikuchi" | 21  | 2      | "Osaka"                 |

次は顧客登録システムから3人目のレコードが入ってきます。

```sql title="living_area 指定のないレコードの INSERT"
INSERT INTO customers (id, name, age, gender) VALUES
  (3, "Kanae Satouchi", 32, 2);
```

| id  | name             | age | gender | living_area (MAY NULL) |
| --- | ---------------- | --- | ------ | ---------------------- |
| 1   | "Koji Taura"     | 48  | 1      | "Tokyo"                |
| 2   | "Mika Kikuchi"   | 21  | 2      | "Osaka"                |
| 3   | "Kanae Satouchi" | 32  | 2      | NULL                   |

顧客登録システムは `living_area` ありの新しいテーブル定義に未対応ですが、 `living_area` カラムは MAY NULL なので
