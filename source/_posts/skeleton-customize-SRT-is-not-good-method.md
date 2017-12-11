---
title: SRT represent's disadvantage
date: 2017-11-20 00:15:48
tags:
---

$SRT$是指使用缩放,旋转,平移来表示变换矩阵<!-- more -->

# SRT表示法

矩阵$M$可以使用$SRT$表示:

$$\overrightarrow{v}M = \overrightarrow{v} SRT = \overrightarrow{v} SR + \overrightarrow{T}$$

# 非等比缩放

考虑如下情况:

$$
\begin{align}
\overrightarrow{v_2} &= \overrightarrow{v_1} M_1\notag\\\\
&= \overrightarrow{v_0}M_0M_1\notag\\\\
&= \overrightarrow{v_1}S_1R_1 + \overrightarrow{T_1}\notag\\\\
&= (\overrightarrow{v_0}S_0R_0 + \overrightarrow{T_0})S_1R_1 + \overrightarrow{T_1}\notag\\\\
&= \overrightarrow{v_0}(S_0R_0S_1R_1) + (\overrightarrow{T_0}S_1R_1 + \overrightarrow{T_1})\notag
\end{align}
$$

如果我们要将$M_0M_1$表示为$SRT$,那么说明$S_0R_0S_1R_1$可以表示为$SR$

如果$S_1$为等比缩放,那么$S_0R_0S_1R_1 = S_0S_1R_0R_1$

那么不是等比缩放呢？

问题转化为存在正交旋转矩阵$R$与缩放矩阵$S$,则$RS$能否表达为$S^{'}R^{'}$?

通过反证法来证明,考虑如下矩阵:

$$
S = 
\begin{bmatrix}
1 & 0 & 0 \\\\
0 & 2 & 0 \\\\
0 & 0 & 1
\end{bmatrix} \quad
R =
\begin{bmatrix}
1 & 0 & 0 \\\\
0 & \frac{\sqrt{2}}{2} & -\frac{\sqrt{2}}{2} \\\\
0 & \frac{\sqrt{2}}{2} & \frac{\sqrt{2}}{2}
\end{bmatrix}
$$

假设存在$S'$和$R'$使得$RS=S'R'$

$$
\begin{alignat}{2}
R' &=
\begin{bmatrix}
r'_{11} & r'_{12} & r'_{13} \\\\
r'_{21} & r'_{22} & r'_{23} \\\\
r'_{31} & r'_{32} & r'_{33}
\end{bmatrix} &\quad
S' &=
\begin{bmatrix}
s'_1 & r0 & 0 \\\\
0 & s'_2 & 0 \\\\
0 & 0 & s'_3
\end{bmatrix}\notag\\\\[2ex]
RS &= 
\begin{bmatrix}
1 & 0 & 0 \\\\
0 & \sqrt{2} & -\frac{\sqrt{2}}{2} \\\\
0 & \sqrt{2} & \frac{\sqrt{2}}{2}
\end{bmatrix} &\quad
S'R' &=
\begin{bmatrix}
s'_1r'_{11} & s'_1r'_{12} & s'_1r'_{13} \\\\
s'2r'_{21} & s'_2r'_{22} & s'_2r'_{23} \\\\
s'3r'_{31} & s'_3r'_{32} & s'_3r'_{33}
\end{bmatrix}\notag
\end{alignat}
$$

结合$RS = S'R'$与$R'$为正交矩阵可得:
$$
\begin{cases}
1 = s'_1 r'_{11} \\\\[2ex]
0 = s'_1 r'_{12} \\\\[2ex]
0 = s'_1 r'_{13} \\\\[2ex]
r'^2_{11} + r'^2_{12} + r'^2_{13} = 1
\end{cases}
$$

$\therefore s'_1 = \pm{1}$,同理可得:$s'_2 = \pm \frac{\sqrt{2}\sqrt{5}}{2}$与$s'_3 = \pm \frac{\sqrt{2}\sqrt{5}}{2}$

$$
\begin{align}
\because det(AB) &= det(A)det(B) \quad RS = S'R' \quad det(S') = s'_1s'_2s'_3\notag\\\\[2ex]
\therefore det(R') &= \frac{det(R)det(S)}{det(S')}\notag\\\\[2ex]
&= \frac{1\times (1\times 2 \times 1)}{\pm{1}\times \frac{\sqrt{2}\sqrt{5}}{2}\times \frac{\sqrt{2}\sqrt{5}}{2}}\notag\\\\[2ex]
&= \pm \frac{4}{5} \neq 1\notag
\end{align}
$$
与$R'$为正交矩阵的假设不符.

# 分解矩阵为SRT

假设某个节点有n个祖先,其局部变换矩阵分别为$M_1,M_2,\cdots M_n$.

$$
\begin{align}
M_{SRT} &= M_0M_1\cdots M_n\notag\\\\[2ex]
M_{RT} &= R_0T_0R_1T_1\cdots R_nT_n\notag
\end{align}
$$

从$M_{SRT}$中很容易分解出平移项,提取第四行元素即可

从$M_{RT}$中剥离平移,可以得到$M_R$矩阵,这个矩阵必须被转换为四元数或欧拉角

最麻烦的是提取缩放,首先将$M_{SRT}$中的平移项置零,得到$M_{SR}$.

然后通过如下公式计算缩放矩阵:

$$M_S = M_{SR}M_R^{-1}$$

只需要从该矩阵中提取对角线的元素作为缩放,其余元素是产生倾斜(变形))的部分

# More Info

[GPU Pro 5 - Managing Transformations in Hierarchy](http://what-when-how.com/Tutorial/topic-547pjramj8/GPU-Pro-Advanced-Rendering-Techniques-412.html)
[矩阵乘积的行列式等于行列式的乘积](https://zh.wikipedia.org/wiki/%E7%9F%A9%E9%98%B5#.E8.A1.8C.E5.88.97.E5.BC.8F)
[插入公式诀窍](https://zhuanlan.zhihu.com/p/31188118)
[MathJax语法](http://blog.csdn.net/u012302219/article/details/51452649)