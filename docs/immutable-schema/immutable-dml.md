---
sidebar_position: 4
---

# Immutable DML

## SELECT

**SELECTも、人間の試行錯誤を前提とし、スキーマが確定するまでは柔軟にレコードを返してあげる。静的型付け言語はレコード単位の処理の際にErr型で答えてあげる**

カラムは名前だけ指定して取る（データ型は指定しない）。
データ型のバージョン間での途中変更は、nullability変更のみ許容。クライアントのカラム値取得においては、下記のように、バージョン間でデータ型が異なっていても困らないのだが、ORDER BY や GROUP BY などの各種演算で型が合わない場合の挙動を規定できないため。

SELECTを投げる時点では、データ型を気にしないので、そのテーブルの少なくとも1つのアクティブバージョンにそのカラム名が含まれていれば、そのテーブルのアクティブバージョン全てのレコードが返却対象。

1レコードずつカラム値を取り出す際にせ静的型付け言語ならば型指定をする。その型指定がそのレコードのカラム型と不一致なら、Err型を返す。

```rust
let records = conn.execute("SELECT id, c FROM t")?;
for record in records {
  let id: u64 = record.get("id")?; // success
  let c: u32 = match record.get("c")? {
    Ok(c) => c,
    Err(DataTypeMismatch) => 12345, // 実は v2 -> v3 で ALTER TABLE t DROP COLUMN c; していたので、 record が v3 のときには vのｎレコードは Option<u32> が必要になる。v2のレコードは u32 で引っ張れる。
  }
}
```

selectは、ApparentPKが同じもの同士、最大のrevisionから取得する。
同一ApparentPKのレコードは、複数バージョンにまたがる可能性があることに注意。

### SELECTの対象バージョンの特定

1. projectionで指定した全てのカラム持つactiveバージョンが一つも存在しない場合、Errとする。そうでなければ合法。
2. SELECTの対象になるバージョンは、projection (もっというとSQL)からは決まらず、naviテーブルのみから決まる。同じApparentPKを持つ最新revisionのバージョンがSELECT対象。

#### 例

```text
v1: id (PK), c1
v2: id (PK)
v3: id (PK), c2
```

```sql
insert into t (id, c1) values (1, 1);
-- v1: (1, 1)

alter table t drop c1;
-- v1: (1, 1)
-- v2:

insert into t (id, c1) values (2, 2);
-- v1: (1, 1), (2, 2)
-- v2:

insert into t (id) values (3);
-- v1: (1, 1), (2, 2)
-- v2: (3)

select id, c1 from t;
-- naviテーブルを見る。 id == 1, 2, 3 のいずれも、最新revisionは1である（UPDATEされていないので）。naviテーブルに従い、id == 1, 2 は v1 から、 id == 3 は v2 から取得する。
-- -> v1:(1, 1), v1:(2, 2), v2:(3, NULL)

alter table t add c2 INT NOT NULL;
-- v1: (1, 1), (2, 2)
-- v2: (3)
-- v3:

insert into t (id, c1, c2) values (4, 4, 4);
-- v1: (1, 1), (2, 2)
-- v2: (3)
-- v3: (4, 4, 4)

insert into t (id, c1) values (5, 5);
-- v1: (1, 1), (2, 2), (5, 5)
-- v2: (3)
-- v3: (4, 4, 4)

select id, c2 from t;
-- -> v1:(1, NULL), v1:(2, NULL), v2:(3, NULL), v3:(4, 4), v1:(5, NULL)
```

## INSERT

同一ApparentPKにレコードが **見えない** ことを確認し、revision = 1 のImmutableRowを挿入する。

### INSERTの対象バージョンの特定

1. 挿入対象として指定した全てのカラム持つactiveバージョンが一つも存在しない場合、Errとする。そうでなければ合法。
2. 大きいactiveバージョンから順に、挿入対象として指定した全てのカラム持つactiveバージョンを探索し、マッチしたものを対象バージョンとする。

## UPDATE

同一ApparentPKから最大のrevisionを取得し、それ +1 のImmutableRowを挿入する。

### UPDATEの対象バージョンの特定

UPDATE は、セマンティクス上 "SELECT + INSERT" として扱う。

SELECT対象はSELECTと同様に、INSERT対象はINSERTと同様に決定される。

## DELETE

同一ApparentPKから最大のrevisionを取得し、それ +1 の barrier を挿入する。
