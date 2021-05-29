---
sidebar_position: 3
---

# Immutable DDL

## CREATE TABLE

PRIMARY KEY 指定は必須。VisiblePKと呼ぶ。

内部的に、 VisiblePK + revision を TruePK として扱う。
TruePKにはツリーインデックス（TruePK全体）なりハッシュインデックス（ただしVisiblePKまで）が付与される（storage engine 実装依存）。

## ALTER TABLE

- 同名のカラムは異なる型に変更できない。（できてしまうと、SELECTで）
