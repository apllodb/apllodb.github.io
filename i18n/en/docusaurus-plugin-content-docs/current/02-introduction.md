---
sidebar_position: 2
slug: /introduction/
---

# Introduction

## What's apllodb for?

apllodb is a database dedicated to **digital document management**.

The term "digital document management" includes [digital archives](https://en.wikipedia.org/wiki/Digital_Archives) and simpler document management (creation, retrieval, and use).
In the digital document management, apllodb is especially useful in cases where document are still stored in analog form and will be converted to digital data.
The purpose of translating analog data into digital is not only to reduce the space to keep them, but also to make applications (visualizing, searching, and aggregating) from the data.
When considering making applications from digital data, it is necessary to accumulate data while organizing the information, and to make **structured** data.
There are various methods for structuring, but the relational algebra model is one that is easy to handle for both application programs and humans. Relational algebra model is similar to table structures like those in Excel or spreadsheets.

It's not always easy to put analog data into a table structure.
It is good if the original data, such as books, is well structured, but often it is written flat like follows.

> Albert Einstein; 14 March 1879 – 18 April 1955) was a German-born theoretical physicist,[5] widely acknowledged to be one of the greatest physicists of all time. Einstein is known for developing the theory of relativity, but he also made important contributions to the development of the theory of quantum mechanics. Relativity and quantum mechanics are together the two pillars of modern physics.[3][6] His mass–energy equivalence formula E = mc2, which arises from relativity theory, has been dubbed "the world's most famous equation".[7] His work is also known for its influence on the philosophy of science.[8][9] He received the 1921 Nobel Prize in Physics "for his services to theoretical physics, and especially for his discovery of the law of the photoelectric effect",[10] a pivotal step in the development of quantum theory. His intellectual achievements and originality resulted in "Einstein" becoming synonymous with "genius".[11]

_(Quoted from [Wikipedia](https://en.wikipedia.org/wiki/Albert_Einstein) )_

You may find some structure from the above description and abstract the following columns:

- Name
- Date of birth
- Date of death
- Birthplace
- Academic field
- Major achievement 1
- ...
- Major achievement 5
- Awards

However, you may find another description from the same or a different document:

> Sir Isaac Newton PRS (25 December 1642 – 20 March 1726/27[a]) was an English mathematician, physicist, astronomer, theologian, and author (described in his time as a "natural philosopher") who is widely recognised as one of the greatest mathematicians and most influential scientists of all time. His book Philosophiæ Naturalis Principia Mathematica (Mathematical Principles of Natural Philosophy), first published in 1687, established classical mechanics. Newton also made seminal contributions to optics, and shares credit with German mathematician Gottfried Wilhelm Leibniz for developing infinitesimal calculus.

_(Quoted from [Wikipedia](https://en.wikipedia.org/wiki/Isaac_Newton) )_

Here we can see that one `Academic field` column is not enough, and in some cases we may also want a `Job history` column.
When digitizing analog data, it is difficult to determine the structure from the beginning. It is often necessary to modify the structure while looking into the data.

Databases that utilize relational algebraic models (tables) are called RDBMS (Relational Database Management System).
A normal RDBMS is not designed to change the table structure frequently.
It is difficult to add a column to a table that already contains records (especially in case of columns with NOT NULL and without default values). Also, when you think a certain column is not necessary for future records and you drop the column, values of the column in the existing record will disappear.
In other words, existing RDBMSs are not suitable for applications in which humans design table structure by trial and error while accumulating data.

apllodb is an RDBMS for exactly this kind of use.

## Overview of apllodb

As mentioned above, apllodb is an RDBMS.
The reasons for adopting RDBMS architecture are as follows.

1. Table structure is easy to handle for both people who add data in digital document management and application developers who use the data for applications.
2. RDBMSs have a standard query language called SQL (a language for searching and aggregating data), which makes it easy to perform ad hoc analysis as well as application development.
3. Many RDBMSs have the concept of transactions, which means that even if a database system or computer gets broken while storing data, the data will be consistent (either all will disappear or all will remain).

However, RDBMSs are not suitable for applications where you have to make trial and error on the table structures while adding data.
Therefore, apllodb has added the concept of **Immutable Schema** to RDBMS.

Although there are other important characteristics for digital document management besides frequent changes in table structures, we focused on Immutable Schema in the initial version v0.1.
The characteristics that we will focus on supporting in the future are summarized in [Future Development Plan](04-future-work.md).

## What is Immutable Schema?

In a normal RDBMS, table operations (creating, modifying, and deleting table structures) and record operations (inserting, updating, and deleting records) are mutable. Once a table or record is modified or deleted, it is essentially irreversible.
Immutable Schema makes these operations immutable.

This is not just keeping a backup before modifications.
For example, consider deleting one column when there are already records in a table.
A normal mutable RDBMS will erase the value of the column to be deleted for all records.
How can we do this in an immutable way?
In the Immutable Schema, the table structure and records are kept as follows:

- Leave the table structure and records before the column deletion, and
- create a new table structure after the column deletion, and
- the subsequent records will be added to the new table definition (if possible).

In the RDBMS world, table operations are called DDL, so the immutable table structure changes described above are called **Immutable DDL**.
Similarly, we call the immutable record operations **Immutable DML**.
With Immutable DML, even after updating the column values of a record, it is possible to revert to the values before the update, or recover a record that has been deleted.

Immutable Schema contains Immutable DDL and Immutable DML, and is the main feature of apllodb.
