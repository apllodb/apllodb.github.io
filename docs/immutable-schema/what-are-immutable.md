---
sidebar_position: 101
---

# "Immutable" の範囲

RDBMSで行う操作のうち、「テーブル定義 (DDL)」と「レコード操作 (DML)」の2つを取り上げる。
これらが共にmutableであるのが、通常のRDBMSである。つまり、ALTER TABLE文によりDDLは変更され、UPDATE, DELETE文によりレコードは変更される。

Immutable Schema においては、「テーブル定義 (DDL)」と「レコード操作 (DML)」の両方を Immutable とする。ただし、利用者が発行するDDL, DML文では ALTER TABLE / DROP TABLE や UPDATE / DELETE が利用可能であり、システムがそれを自動的に変更する。

それぞれを immutable にすることの意味合い, Pros/Cons を説明する。

## Immutable な DML

DML を immutable にするとは、一度 INSERT したレコードに対し、 UPDATE, DELETE という更新操作を認めないことである。
例えば、次のようなレコードがあるとする:

```sql
(id, name) = (1, "Shou Nakatani")
```

`name` のスペルミスに気づいたため、 `id=1` のレコードを修正したいとする。通常の SQL においては UPDATE 文を使って、同じレコードを更新修正するが、Immutable な DMLでは、 revision 属性をシステムで追加し、

```sql
(id, revision, name) = (1, 1, "Shou Nakatani"), (1, 2, "Sho Nakatani")
```

という風に、より大きい revision を付与したレコードを追記する。「同一 id を持つレコードのうち、有効なのは、最大の revision を持つレコード」という意味論である。

また、 deleted 属性をシステムで追加すれば、 DELETE 文を使わずにレコードの削除を表現することができる。

```sql
(id, revision, name, deleted) =  (1, 1, "Shou Nakatani", false), (1, 2, "Sho Nakatani", false), (1, 3, "Sho Nakatani", true)
```

ならば、 `id=1` のレコードは削除されたこととなる。

revision, deleted 属性を使った実装以外にも同種の意味論は表現可能であるが、とにかく「更新・削除を、追記だけで表現する」というのが Immutable な DML のコンセプトである。

この表現のメリットは、

- 同一の identity を持つエンティティ（≒レコード）の変遷が失われずに記録されている
- システム面で、INSERT-only の場合、トランザクションの実装が簡潔にすることができる

デメリットは、

- 更新・削除のたびにレコードが増えるので、mutable な DML を採用した場合と比べ、 INSERT に対する UPDATE/DELETE の比率に応じて消費容量が大きくなる
- 更新ヘビーなワークロードには不向き
- 上記消費容量増加は、メモリ・ディスクのコスト増だけでなく、検索速度低下にもつながる

といった点である。

Immutable な DML のアイディアは、特に新しいものではない。筆者の知る限り、RDBMS自体で Immutable な DML を採用したものはないが、RDBMSを利用するアプリケーションエンジニアが ["テンポラルモデル" のような append-only なテーブル設計を採用したり、それをサポートするためのクライアントライブラリが使われている](https://www.slideshare.net/itohiro73/jjug-ccc-2017-spring-bitemporal-data-modeling-and-reladomo)。

## Immutable な DDL

DDL を immutable にするということとそのメリットは、本ドキュメントの冒頭、課題解決のセクションで説明したとおりである。

デメリットとしては、以下が挙げられる。

- 同一のテーブルが複数のバージョンを持ち（例: カラム追加した際、そのカラムを持つバージョンが新しく CREATE TABLE される）、それぞれのバージョンにレコードを分散して保持するため、スキャン性能が下がる。
- テーブルのバージョンが多くなりすぎると、カラムの組み合わせの種類が多くなり、利用者にとって把握が困難になる。

過去のレコードを壊さずに ALTER TABLE ができる（≒ `ALTER TABLE` を、システムが `CREATE TABLE 新バージョン` と変換する）ことは APLLO v3 DB が目指す根幹的な価値だが、バージョンを作りすぎると性能面でもデータ把握の面でも無理が出てくるため、一度作ったバージョンを利用者が 統合 することにインセンティブが働くような工夫を、仕様として導入していく（後述）。

## APLLO v3 DB で Immutable DML, Immutable DDL を採用する理由

Immutable DDL については冒頭に説明したとおり、それ自身を根幹的な価値と位置づけているため、採用するものとする。

DML は immutable / mutable の選択の余地があるが、 immutable DML の「更新ヘビーなワークロードに不向き」というデメリットは、APLLO v3 のメインユースケースのデジタルアーカイブ用途を考えるとヒットしないと考えた。
人力でのデータ入稿が中心になり、UPDATE / DELETE比率自体は小さくはないが、人力入稿のレコードの絶対量は多くはならないことが予想される。
SNS投稿を自動で APLLO v3 DB に投入するユースケースもあり、場合によってはレコード数が多くなるが、この場合は基本的には INSERT-only になることが予想される。つまり mutable DML でも immutable DML でも、容量差は大きくならない。

また、  Immutable DML と Immutable DDL を両方採用する場合には、「あるテーブルについて任意の時点のテーブル定義・レコード状態に戻る」ことができるようになる。
通常のRDBMSでも "スナップショットを取っていれば" そのスナップショットの状態に戻れるようになるが、 "任意の時点" とはいかない。
任意時点へ戻れることが実用上役立つかはユースケース次第ではあるが、強力な性質であることには間違いなく、かつ mutable DML を選択した場合には得ることのできない、不可逆な性質でもある。

以上を考慮し、APLLO v3 DB では Immutable DML, Immutable DDL を採用することとした。
