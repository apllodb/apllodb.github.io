---
sidebar_position: 2
---

# APLLO SQL の意味論

## APLLO SQLの意味論の記述

APLLO SQL は、次のように細分化される:

- APLLO SQL
  - APLLO DDL
    - APLLO CREATE TABLE: $T_{createTableCommand}$
    - APLLO ALTER TABLE: $T_{alterTableCommand}$
    - APLLO DROP TABLE: $T_{dropTableCommand}$
  - APLLO DML
    - APLLO SELECT: $T_{selectCommand}$
    - APLLO INSERT: $T_{insertCommand}$
    - APLLO UPDATE: $T_{updateCommand}$
    - APLLO DELETE: $T_{deleteCommand}$

APLLO SQLが操作する対象と可能な操作の種類は、以下の表の通り。

| 対象         | 作成    | Deactivate | set   | unset |
| ---------- | ----- | ---------- | ----- | ----- |
| バージョンセット   | o     | undef      | undef | undef |
| バージョンセット制約 | undef | undef      | o     | o     |
| バージョン      | o     | o          | undef | undef |
| 型          | o     | undef      | undef | undef |
| バージョン制約    | undef | undef      | o     | undef |
| レコード       | o     | o          | undef | undef |

APLLO SQLの意味論を記述するとは、ある構文を満たすAPLLO SQLが与えられたとき、それが上述の操作対象に及ぼす影響を記述することである。

## $T_{createTableCommand}$

### 操作

| 対象         | 作成    | Deactivate | set   | unset |
| ---------- | ----- | ---------- | ----- | ----- |
| バージョンセット   | o     | undef      | undef | undef |
| バージョンセット制約 | undef | undef      | o     |       |
| バージョン      | o     |            | undef | undef |
| 型          | o     | undef      | undef | undef |
| バージョン制約    | undef | undef      | o     | undef |
| レコード       |       |            | undef | undef |

### 正常系

- バージョンセット: 作成
  - $T_{tableName}$ を作成
- バージョンセット制約: set
  - $T_{tableConstraint}$ をset
  - $T_{columnConstraint}$ のうち、 `PRIMARY KEY`, `UNIQUE` 制約をset。
- バージョン: 作成
  - $T_{tableName} . v_1$ を作成
- 型: 作成
  - $T_{dataType}$ と NOT NULL を作成
- バージョン制約: set
  - $T_{columnConstraint}$ のうち NOT NULL 以外をset

### 異常系

#### クラス 42 — 構文エラーもしくはアクセス規則違反

- $E_{duplicateTable}$
  - IF EXISTS 指定が存在しないが、 $T_{tableName}$ が既存のバージョンセットと同名の場合。
- $E_{duplicateColumn}$
- $E_{duplicateAlias}$
- $E_{invalidColumnDefinition}$
  - $T_{columnConstraint}$ に `NULL` と `NOT NULL` が両方指定されている。

## $T_{alterTableCommand}$

### 操作

| 対象         | 作成    | Deactivate | set   | unset |
| ---------- | ----- | ---------- | ----- | ----- |
| バージョンセット   |       | undef      | undef | undef |
| バージョンセット制約 | undef | undef      | o     | o     |
| バージョン      | o     | o          | undef | undef |
| 型          | o     | undef      | undef | undef |
| バージョン制約    | undef | undef      | o     | undef |
| レコード       |       |            | undef | undef |

### 正常系

- バージョンセット制約: set
  - $T_{tableConstraint}$ に従いset
  - $T_{columnConstraint}$ のうち `PRIMARY KEY`, `UNIQUE` 制約をset
  - コマンドに現れないテーブル制約を、前バージョンから引き継ぎset
- バージョンセット制約: unset
  - $T_{tableConstraint}$ に従いunset
  - $T_{columnConstraint}$ のうち `PRIMARY KEY`, `UNIQUE` 制約をunset
- バージョン: 作成
  - $T_{tableConstraint} . v_{current+1}$ を作成
- バージョン: deactivate
  - $v_1$ ... $v_{current}$ のうち、自動アップグレードに成功したバージョンをdeactivate
- 型: 作成
  - コマンドに現れないカラムのデータ型を、前バージョンから引き継ぎ作成
    - ただし、 $T_{dropColumn} :: ... :: T_{columnReference}$ のカラムのデータ型は作成しない
  - $T_{addColumn} :: ... :: T_{columnDefinition}$ のカラムのデータ型を作成
- バージョン制約: set
  - $T_{addColumn} :: ... :: T_{columnConstraint}$ のうち `NOT NULL` 制約以外をset
  - コマンドに現れないカラム制約を、前バージョンから引き継ぎset
    - ただし、 $T_{dropColumn} :: ... :: T_{columnReference}$ のカラムのバージョン制約は作成しない

### 異常系

#### クラス 42 — 構文エラーもしくはアクセス規則違反

- $E_{undefinedTable}$
- $E_{undefinedColumn}$
- $E_{duplicateColumn}$
- $E_{invalidColumnDefinition}$
  - $T_{columnConstraint}$ に `NULL` と `NOT NULL` が両方指定されている。

## $T_{dropTableCommand}$

### 操作

| 対象         | 作成    | Deactivate | set   | unset |
| ---------- | ----- | ---------- | ----- | ----- |
| バージョンセット   |       | undef      | undef | undef |
| バージョンセット制約 | undef | undef      |       |       |
| バージョン      |       | o          | undef | undef |
| 型          |       | undef      | undef | undef |
| バージョン制約    | undef | undef      |       | undef |
| レコード       |       |            | undef | undef |

### 正常系

- バージョン: deactivate
  - 全バージョンを deactivate

### 異常系




















### APLLO DROP TABLE (IF EXISTS)

#### 文法

```sql
DROP TABLE IF EXISTS {T_tableName};
```

```bnf
T_tableName :=
  文字列;
```

#### 意味論

```text
if {T_tableName} in {Catalog}:
  for all v_i in {TableCatalog}:
```

```sql
DEACTIVATE "{T_tableName}.{v_i}";
```

---

`else:`

```sql
;
```

### APLLO ALTER TABLE (ADD, w/o NOT NULL)

#### 文法

```sql
ALTER TABLE {T_tableName} ADD COLUMN {T_colDefWithoutNotNull};
```

```bnf
T_tableName :=
  文字列;

T_colDefWithoutNotNull :=
  T_colName  T_colType  T_colConstraintWithoutNotNull*;

T_colConstraintWithoutNotNull :=
  PRIMARY KEY;

T_colType :=
  INTEGER
  | TEXT;
```

#### 互換 / 非互換

互換ALTER

#### 意味論

`if {T_tableName} in {Catalog} && {T_colName} in {TableCatalog}:`

```sql
E_duplicateColumn;
```

---

`else if {T_tableName} in {Catalog}:`

```sql
CREATE TABLE {v_(current+1)} (
  {{T_colList} in {VersionCatalog_{v_current}}},
  {T_colDefWithoutNotNull}
);

-- 自動アップグレード
INSERT INTO {T_tableName}.{v_(current+1)} {T_colList in {VersionCatalog_{v_current}}}
  SELECT {T_colList in {VersionCatalog_{v_current}}} FROM {T_tableName}.{v_current};

DEACTIVATE {T_tableName}.{v_current};
```

---

`else:`

```sql
E_undefinedTable;
```

### APLLO ALTER TABLE (ADD, w/ NOT NULL)

#### 文法

```sql
ALTER TABLE {T_tableName} ADD COLUMN {T_colDefWithNotNull};
```

```bnf
T_tableName :=
  文字列;

T_colDefWithNotNull :=
  T_colName  T_colType  T_colConstraintWithNotNull*;

T_colConstraintWithNotNull :=
  NOT NULL  T_colConstraintWithoutNotNull*;

T_colConstraintWithoutNotNull :=
  PRIMARY KEY;

T_colType :=
  INTEGER
  | TEXT;
```

#### 互換 / 非互換

非互換ALTER

ALTER後にエラーになる Raw SELECT, Raw INSERT の例:

```sql
ALTER TABLE {T_tableName} ADD COLUMN x INTEGER NOT NULL;
INSERT INTO {T_tableName} (... (xは含まない)) VALUES (...);
```

#### 意味論

`if {T_tableName} in {Catalog} && {T_colName} in {TableCatalog}:`

```sql
E_duplicate_column;
```

---

`else if T_tableName in Catalog:`

```sql
CREATE TABLE {v_(current+1)} (
  {{T_colList} in {VersionCatalog_{v_current}}},
  {T_colDefWithNotNull}
);
```

---

`else:`

```sql
E_undefined_table;
```

### APLLO ALTER TABLE (DROP)

#### 文法

```sql
ALTER TABLE {T_tableName} DROP COLUMN {T_colName};
```

```bnf
T_tableName :=
  文字列;
```

#### 互換 / 非互換

非互換ALTER

ALTER後にエラーになる Raw SELECT, Raw INSERT の例:

```sql
ALTER TABLE T_tableName DROP COLUMN x;
SELECT x FROM T_tableName;
```

#### 意味論

`if {T_tableName} in {Catalog} && {T_colName} not in {TableCatalog}:`

```sql
  E_undefined_column;
```

---

`else if {T_tableName} in {Catalog}:`

```sql
CREATE TABLE {v_(current+1)} (
  { {{T_colList} in {VersionCatalog_{v_current}}} - {T_colName}}
);
```

---

`else:`

```sql
E_undefined_table;
```
