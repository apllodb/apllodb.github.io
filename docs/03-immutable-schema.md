---
sidebar_position: 3
slug: /ImmutableSchema/
---

# Immutable Schema

- イントロ最後からのつなぎ
- Immutable DDL, Immutable DML をさらりと
- 利点はイントロで述べたとおり。ここでは内容に触れる。

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
