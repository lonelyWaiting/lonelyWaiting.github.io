---
title: perspective correction
date: 2018-09-14 22:27:05
tags: Rendering
categories: Rendering
---

![perspective correction](/resources/images/perspective_correction/perspective_correction.png)<!-- more -->

# 需求

光栅化时,三角形内部的顶点属性是由三个顶点插值而来,因此需满足条件:

- 屏幕空间的属性可以线性插值

# 推导

图中$P_1$,$P_2$,$P_3$,$P_4$共线,$S_1$,$S_2$,$S_3$,$S_4$是在近平面上的投影点

假设各点坐标如下:
- $P_1$:($x_1$,$z_1$)
- $P_2$:($x_2$,$z_2$)
- $P_3$:($x_3$,$z_3$)
- $P_4$:($x_4$,$z_4$)
- $S_1$:($s_1$,$d$)
- $S_2$:($s_2$,$d$)
- $S_3$:($s_3$,$d$)
- $S_4$:($s_4$,$d$)

`d`为近平面的Z值

$S_3$为$S_1$,$S_2$的中点,从图中可见在$P_3$并不在$P_1$,$P_2$的中点

因此,Z值在屏幕空间并不成线性关系,由于需要在屏幕空间插值,我们必须找到一个满足线性关系的量

各点向`X`轴做垂线,可得到以下关系:

$$\frac{x_1}{s_1} = \frac{z_1}{d} \Rightarrow s_1 = \frac{d \times x_1}{z_1}$$
$$\frac{x_2}{s_2} = \frac{z_2}{d} \Rightarrow s_2 = \frac{d \times x_2}{z_2}$$
$$\frac{x_4}{s_4} = \frac{z_4}{d} \Rightarrow s_4 = \frac{d \times x_4}{z_4}$$

屏幕空间的属性要满足线性关系,因此:
$$s_4 = s_1 \times (1 - t) + s_2 \times t$$

$$\therefore \frac{d \times x_4}{z_4} = \frac{d \times x_1}{z_1} \times (1 - t) + \frac{d \times x_2}{z_2} \times t$$
$$\therefore \frac{x_4}{z_4} = \frac{x_1}{z_1} \times (1 - t) + \frac{x_2}{z_2} \times t\tag{1}$$

设直线方程为:
$$a \times x + b \times z = c$$

$$\Rightarrow x = \frac{c - b \times z}{a} $$

代入(1)中:

$$\frac{c - b \times z_4}{a \times z_4} = \frac{c - b \times z_1}{a \times z_1}\times (1 - t) + \frac{c - b \times z_2}{a \times z_2} \times t$$

$$\Rightarrow \frac{c}{a \times z_4} = \frac{c}{a \times z_1} \times (1 - t) + \frac{c}{a \times z_2} \times t$$

$$\Rightarrow \frac{1}{z_4} = \frac{1}{z_1} \times (1 - t) + \frac{1}{z_2} \times t$$

可见在屏幕空间$\frac{1}{z}$满足线性关系

# 顶点属性插值

以颜色插值为例,假设$P_1$处的颜色为$C_1$,$P_2$处的颜色为$C_2$,则:

$$\frac{C_4 - C_1}{C_2 - C_1} = \frac{z_4 - z_1}{z_2 - z_1}$$

$$\therefore C_4 = \frac{(C_2 - C_1)\times (z_4 - z1)}{z_2 - z_1} + C_1\tag{2}$$

$$\because z_4 = \frac{1}{\frac{1 - t}{z_1} + \frac{t}{z_2}} = \frac{z_1\times z_2}{z_2 \times (1 - t) + z_1 \times t}$$

$$\because z_4 - z_1 = \frac{z_1 \times z_2 - z_1 \times z_2 \times (1 - t) - z_1^2 \times t}{z_2 \times (1 - t) + z_1 \times t} = \frac{z_1\times t \times (z_2 - z_1)}{z_2 \times (1 - t) + z_1 \times t}$$

$$\therefore \frac{z_4 - z_1}{z_2 - z_1} = \frac{z_1 \times t}{z_2 \times (1 - t) + z_1 \times t}$$

代入(2)式:

$$C_4 = \frac{(C_2 - C_1)\times z_1 \times t}{z_2 \times (1 - t) + z_1 \times t} + C_1$$

$$\Rightarrow C_4 = \frac{C_2\times z_1 \times t + C_1\times z_2 \times (1 - t)}{z_2 \times (1 - t) + z_1 \times t}$$

$$\Rightarrow C_4 = \frac{C_2\times t \times \frac{1}{z_2} + C_1\times (1 - t) \times \frac{1}{z_1}}{\frac{1-t}{z_1} + \frac{t}{z_2}}$$

$$\Rightarrow \frac{C_4}{z_4} =  \frac{C_2}{z_2}\times t +  \frac{C_1}{z_1}\times (1 - t)$$

# 透视矩阵推导

NDC空间:
$$-1 \leq x \leq 1$$
$$-1 \leq y \leq 1$$
$$0 \leq z \leq 1$$

![X截面投影](/resources/images/perspective_correction/perspective_x_item.png)

![Y截面投影](/resources/images/perspective_correction/perspective_y_item.png)

根据上图可知:
$$\frac{x}{z} = \frac{x'}{d} \Rightarrow x' = \frac{d \times x}{z}\tag{3}$$
$$\frac{y}{z} = \frac{y'}{d} \Rightarrow y' = \frac{d \times y}{z}\tag{4}$$

定义宽高比为`r`

$$tan(\frac{\alpha}{2}) = \frac{1}{d} \Rightarrow d = \frac{1}{tan(\frac{\alpha}{2})}$$
$$tan(\frac{\beta}{2}) = \frac{r}{d} = rtan(\frac{\alpha}{2})$$

代入(3),(4)中可得:
$$x' = \frac{d \times x}{z} = \frac{x}{tan(\frac{\alpha}{2}) \times z}$$
$$y' = \frac{d \times y}{z} = \frac{y}{tan(\frac{\alpha}{2}) \times z}$$

$$\because -1 \leq y' \leq 1, -r \leq x' \leq r$$
$$\Rightarrow -1 \leq \frac{y}{tan(\frac{\alpha}{2}) \times z} \leq 1$$
$$\Rightarrow -1 \leq \frac{x}{r \times tan(\frac{\alpha}{2}) \times z} \leq 1$$

我们已知$\frac{1}{z}$成线性关系,我们希望近平面,远平面深度值分别映射到$[0,1]$,因此,设:

$$0 \leq A \times \frac{1}{z} + B \leq 1$$
$$A \times \frac{1}{n} + B = 0$$
$$A \times \frac{1}{f} + B = 1$$

$$\Rightarrow A = \frac{-n\times f}{f - n}, B = \frac{f}{f - n}$$

$$\therefore 0 \leq \frac{f}{f - n} - \frac{n \times f}{f - n} \times \frac{1}{z} \leq 1$$

因此,透视投影矩阵如下:
$$
\begin{bmatrix}
\frac{1}{r\times tan(\frac{\alpha}{2})} & 0 & 0 & 0 \\\\
0 & \frac{1}{tan(\frac{\alpha}{2})} & 0 & 0 \\\\
0 & 0 & \frac{f}{f - n} & 1 \\\\
0 & 0 & \frac{n\times f}{n - f} & 0
\end{bmatrix}
$$

逆矩阵如下:
$$
\begin{bmatrix}
r \times tan(\frac{\alpha}{2}) & 0 & 0 & 0 \\\\
0 & tan(\frac{\alpha}{2}) & 0 & 0 \\\\
0 & 0 & 0 & \frac{n - f}{n\times f} \\\\
0 & 0 & 1 & \frac{1}{n}
\end{bmatrix}
$$

# 深度重建

## 还原深度值

首先推导下如何从`Depth Buffer`还原深度值,`Depth Buffer存的值为`:$Z_{buffer} = \frac{f}{f - n} - \frac{n \times f}{f - n} \times \frac{1}{z}$

$$Z_{buffer} \in [0,1]$$
$$\Rightarrow \frac{n \times f}{f - n} \times \frac{1}{z} = \frac{f}{f - n} - Z_{buffer}$$
$$\Rightarrow \frac{n \times f}{z} = f - Z_{buffer} \times (f - n)$$
$$\Rightarrow z = \frac{n \times f}{f - Z_{buffer} \times (f - n)}$$
$$\Rightarrow z = \frac{1}{\frac{1}{n} - \frac{f - n}{n \times f} Z_{buffer}}$$
$$\Rightarrow z = \frac{1}{\frac{1}{n} + \frac{n - f}{n \times f} Z_{buffer}}$$
$$\Rightarrow z = \frac{1}{\frac{1}{n} + \frac{1}{f}\times (1 - \frac{f}{n}) Z_{buffer}}$$
$$z \in [n, f]$$


## CameraSpace重映射深度值为[0,1]

将CameraSpace原点映射至0,远平面映射至1
$$z_{cs} = \frac{z}{f} = \frac{n \times f}{f - Z_{buffer} \times (f - n)} \times \frac{1}{f}$$
$$\Rightarrow z_{cs} = \frac{n}{f - Z_{buffer} \times (f - n)}$$
$$\Rightarrow z_{cs} = \frac{1}{\frac{f}{n} + \frac{n - f}{n} \times Z_{buffer}}$$
$$\Rightarrow z_{cs} = \frac{1}{\frac{f}{n} + (1 - \frac{f}{n}) \times Z_{buffer}}$$

# Screen Space Ray March

假设屏幕空间坐标(x,y),则齐次坐标为($2\times x - 1$,2 \times y - 1$)

