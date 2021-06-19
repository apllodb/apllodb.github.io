---
sidebar_position: 100
---

# バージョン・アップグレード に関する定義・定理

Immutable DDL を実現するために、テーブルに "バージョン" を設けることを示唆した。このページでは、バージョンに関する定義や意義、定理を示す。

APLLO v3 DB では APLLO SQL というコマンド体型を用いるが、ここで示した定義・定理を元にしてその意味論を記述する。

## 定義: バージョン・テーブル

APLLO DDLを通じてテーブルを操作するコマンドを発行した場合、実体としては ***テーブル*** と ***バージョン*** を操作することになる。

テーブルは、テーブル名やテーブル通して満たすべき制約（例: `UNIQUE` ）というメタデータを保持すると同時に、バージョンの集合を保持する。

*通常のSQLの包含関係:*

```text
テーブル
  |
  v
レコード
  |
  v
カラム
```

*APLLO SQLの包含関係:*

```text
テーブル
  |
  v
バージョン
  |
  v
レコード
  |
  v
カラム
```

APLLO SQLにおいては、テーブルはレコード（≒ 実データ）を持たず、バージョンがレコードを持つ。

## 定義: テーブル・バージョンの命名規則

APLLO `CREATE TABLE {T_tableName}` で、テーブル $T_{tableName}$ と、バージョン $v_1$ が生成される。

その後、同一のテーブルに対する APLLO `ALTER TABLE {T_tableName}` のたびに、 $v_2, v_3, \cdots$ と、1つずつ追加でバージョンが生成される。

バージョンに関する表記は以下の通り:

- $v_i, v_j, \cdots $
  特定のバージョン値を表す $(i, j = 1, 2, 3, \cdots)$
- $v_{current}$ : 対象のテーブルの中で、現在最も大きい、activeなバージョン値

バージョンは、以下の性質を持つ。

- バージョン値は $v_{(\text{1以上の十進整数; バージョン番号})}$ 。
  - 例: $v_1, v_2, v_{12345}$
- APLLO CREATE TABLE の時点で、バージョンは $v_1$ である。
- バージョン番号は、 APLLO ALTER TABLE のたびに1ずつ増加していく。
- バージョンは線形である。つまり、「あるバージョンから枝分かれして別のバージョンが生まれる（木構造）」のようなことはない。
  - 過去のスキーマに "切り戻す" 操作を行った場合でも、バージョン番号は巻き戻らず、新しいバージョンが発行される。
- あるテーブルの任意のレコードは、ただ1つのバージョンに所属する。
  - 例: `(id, name) = (1, "Sho Nakatani")` のレコードは、 `Person` テーブルの $v_2$ に所属する。

## 定義: 型と制約

APLLO `CREATE TABLE {T_tableName}`, APLLO `ALTER TABLE {T_tableName}` は、テーブルとバージョンの ***型*** と ***制約*** を操作する。

APLLO SQにおける型は、 $T_{dataType}$ と、 $T_{columnConstraint}$ の NOT NULL 制約である。
標準SQLにおいては NOT NULL はデータ型ではなく制約として定義されており、APLLO SQLの文法上もNOT NULLは $T_{columnConstraint}$ で扱っている。しかし昨今のプログラミング言語には静的型付けを指向する傾向が）あると捉え、APLLO v3 DBのクライアントがNULL-abilityを型で表現する（Option型やMaybe型）ことを見越し、NOT NULLは型として扱う。

APLLO SQLにおける制約は、 $T_{columnConstraint}$ の NOT NULL 制約以外と、 $T_{tableConstraint}$ である。

型は、全てバージョンに所属する情報である。

制約は、以下のルールで ***バージョン制約*** または ***テーブル制約*** に分類される。個々のレコードが満たすべき制約はバージョン制約、レコード集合が満たすべき制約はテーブル制約になっている。

| 制約          | バージョン制約 | テーブル制約 |
| ----------- | ------- | ---------- |
| DEFAULT     | o       |            |
| CHECK       | o       |            |
| UNIQUE      |         | o          |
| PRIMARY KEY |         | o          |
| FOREIGN KEY | o       |            |

型は不変である。同一テーブルに包含されるレコードの同一カラムが、別々の型を持つ場合、クライアントで全レコード取得した場合の扱いが難しくなる（特にクライアントが静的型付け言語の場合は顕著な）ため。

バージョン制約は不変である。CREATE TABLE, ALTER TABLEにより新しいバージョンが作成される際に、そのバージョンのバージョン制約が決定される。
CREATE TABLEの際にはデフォルトで全てunsetであり、 $T_{columnConstraint}, T_{tableConstraint}$ によってsetするもの（とその内容）を指定できる。
ALTER TABLE の際には、以下のルールに従う:

- デフォルトでunset。
- ただし、前バージョンと同一の $T_{columnName}$ については、前バージョンでsetされていればset。
- ただし、 $T_{addColumn}$ や $T_{modifyColumn}$ の $T_{columnConstraint}, T_{tableConstraint}$ で明示的に指定された場合はそちらが優先される。

テーブル制約は可変である。ただし、setする際、テーブルに包含されるレコードの少なくとも1つがテーブル制約を満たさない場合、テーブル制約のsetは失敗する。

## 定義: バージョンの active / inactive 状態, inactivate 操作

あるテーブル $T_{tableName}$ における $T_{tableName} . v_i$ が ***inactive*** であるとは、 $T_{tableName}$ に対する任意のAPLLO DMLが、 $v_i$ を捜査対象から除外することを指す。

$v_i$ が inactive でないとき、 ***active*** であるという。

active なバージョンを inactive にする操作を ***inactivate*** という。inactivate操作は、 APLLO DROP TABLE の場合を除き、 $v_{current}$ には適用されない。つまり、APLLO DROP TABLE されない限りは、最新バージョンは常に active である。

inactive なバージョンを active にする操作は存在しない。

$v_1$ は active である。

## 定義: テーブルの active / inactive 状態

あるテーブル $T_{tableName}$ が ***active*** であるとは、少なくとも1つのバージョンが active であることである。
さもなければ $T_{tableName}$ は ***inactive*** である。

## 定義: アップグレード

あるテーブル $T_{tableName}$ における $v_i$ から $v_j$ への ***アップグレード*** とは、

*事前条件:*

- $i < j$
- $v_i$ , $v_j$ が共にactive

が成立する状況下で行う、以下の一連の操作を指す。

*操作:*

- トランザクション開始
- $v_i$ への0個以上の Raw SELECT
- $v_j$ への0個以上の Raw INSERT
- $v_i$ の inactivate
- $T_{tableName}$ 以外の任意のテーブルに対する、任意の APLLO DML
- トランザクション完了

逆に、アップグレード中にその他の操作を行うことは認められない。

操作後は、

*事後条件:*

- $v_j$ は、 $v_i$ が操作前に持っていたPrimary Keyを、操作後に全て持つ

を満たす必要がある。

### アップグレードの意義

activeなバージョンを減らす。

$v_j$ としては $v_{current}$ が選ばれる（最新バージョンに追従させる）ユースケースを主眼に置いているが、 $v_i$ から $v_{current}$ への乖離が大きい場合には、中間のバージョンへ一度アップグレードするユースケースもあるかもしれない。

### アップグレード中に $T_{tableName}$ 以外のテーブルへの APLLO DML を認める意図

"$v_i$ → $v_j$ において正規化が進み、$v_i$ のレコードを $v_j$ に移行するためには、分かれたテーブルにもデータ投入が必要" というユースケースを考慮。

## 定義: 統合

あるテーブル $T_{tableName}$ が ***統合*** されているとは、そのテーブルの active なバージョンが唯一つであることを指す。

### 統合の意義

前述のように、バージョンが多くなると性能・利便性が低下する。
利用者はデータモデルを厳密に決める前に気軽に APLLO ALTER TABLE を発行して良いが、機を見て統合を図るのが良い。
統合という名称は、そのプラクティスを定着させやすくするために付けた。

## 定義: バージョン間の型互換性

2つのバージョン $v_i, v_j$ について下記の条件が全て成立するとき、 $v_j$ は $v_i$ に対し ***型互換である*** または ***型互換性がある*** という。

- $i < j$
- $\{ v_i :: T_{columnName} \} \subset{ \{ v_j :: T_{columnName} \} }$
- 同名のカラムの型が、 $v_i, v_j$ の間で一致。（これは、型の不変性により自然に満たされる。）

## 定義: 自動アップグレード

$T_{tableName}$ に対してALTERを発行したとき、その APLLO ALTER TABLE の後、以下の ***自動アップグレード*** 処理がシステムにより実行される。

*操作:*

1. for each $v_i \leftarrow v_1 ... v_{current - 1}$ (activeバージョンのみ) :
    1. continue if $v_{current}$ は $v_i$ と型互換ではない。
    1. for each レコード in $v_i$ :
        1. レコードを $v_{current}$ にINSERTすることを試みる。バージョン制約に抵触した場合はcontinue。（テーブル制約に抵触することはあり得ない）
        2. $v_i$ のレコードをDELETE。
    1. 全てのレコードのINSERTに成功したら、 $v_i$をinactivate。

この操作が全て成功したとき、自動アップグレードは ***成功*** したという。自動アップグレードが成功しなくても、途中経過の操作は巻き戻されない（できる限りアップグレードに近づける）。

## 定理: 統合されたテーブルの active なバージョン

あるテーブル $T_{tableName}$ が統合されているならば、 $T_{tableName}$ の active なバージョンは、$v_{current}$ である。

### 証明

前提より、 $T_{tableName}$ は、active なバージョンを唯一つ持つ。従って、 $T_{tableName}$ は APLLO DROP TABLE されていない（されていたら、active なバージョンは0個なので）。

[定義: active / inactive, inactivate](#定義-active-inactive-inactivate) より、APLLO DROP TABLE されていない限り、 $v_{current}$ は active である。従って、 $T_{tableName}$ の $v_{current}$ は active である。

前提より、active なバージョンは唯一つなので、 $v_{current}$ 以外に active なバージョンは存在しない。
