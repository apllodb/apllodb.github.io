---
sidebar_position: 3
slug: /ImmutableSchema/
---

# Immutable Schema

[イントロダクション](02-introduction.md) で述べたように、Immutable SchemaはImmutable DDLとImmutable DMLから成ります。
Immutable Schemaは、デジタル資料管理のために既に追加したデータ（レコード）を破壊せず、データの観察により得られた新たな情報の整理を可能にします。

この章ではImmutable DDLとImmutable DMLの仕様と、v0.1 における実装手法について説明します。

## Immutable DDLの概要

- CREATE すると v1 ができる
- ALTER または DROP すると次のバージョンができる
- ALTER での例を、スライド資料のスクショ引用ベースに

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
