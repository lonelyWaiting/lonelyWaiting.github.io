---
title: why normal transform use inverse-transpose matrix
date: 2017-12-11 22:48:33
tags:
---

定义$T$为切线,$N$为法线,$M$为切线的变换矩阵,$Q$为法线的变换矩阵<!-- more -->

# 证明

$$
T\cdot N^T = 0\\\\[2ex]
T\cdot M = T'\\\\[2ex]
N\cdot Q = N'\\\\[2ex]
T'\cdot (N')^T = 0\\\\[2ex]
T\cdot M \cdot (N\cdot Q)^T = 0\\\\[2ex]
T\cdot M \cdot Q^T \cdot N^T = 0\\\\[2ex]
\therefore M\cdot Q^T = I\\\\[2ex]
\therefore Q = (M^{-1})^T
$$