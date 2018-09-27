---
title: why Not PI in BRDF implement
date: 2018-09-15 14:41:07
tags: Rendering
categories: Rendering
---

# 案例分析

Lambert的BRDF为$\frac{c_{d}}{\pi}$,在Unity中,Lambert光照实现为:<!-- more -->
```cpp
inline fixed4 UnityLambertLight (SurfaceOutput s, UnityLight light)
{
    fixed diff = max (0, dot (s.Normal, light.dir));

    fixed4 c;
    c.rgb = s.Albedo * light.color * diff;
    c.a = s.Alpha;
    return c;
}

inline fixed4 LightingLambert (SurfaceOutput s, UnityGI gi)
{
    fixed4 c;
    c = UnityLambertLight (s, gi.light);

    #ifdef UNITY_LIGHT_FUNCTION_APPLY_INDIRECT
        c.rgb += s.Albedo * gi.indirect.diffuse;
    #endif

    return c;
}
```
可见并没有除$\pi$

这里首先介绍一下[精确光源(Punctual Light Sources)][1]

## 精确光源
精确光源的定义是无限小,无限亮的光源,如点光源,方向光,聚光灯
虽然并非是物理真实的,但是可以产生比较合理的光照结果且计算非常方便
精确光源可参数化为关于光源颜色$c_{light}$以及光方向$l_c$的方程

其中$c_{light}$的定义为:
> 白色Lambert表面被光方向平行于表面法线($l_c$ == n)的光源照亮时的颜色

精确光源主要的好处是极大的简化了反射方程,以下为推导过程

定义一个微面光源,光源中心方向为$l_c$,且光照角度范围为$\varepsilon$:
$$\forall l|\angle(l,l_c) > \varepsilon, \quad L_{tiny}(l) = 0$$
$$if \quad l_c = n, then \quad c_{light} = \int_\Omega\frac{1}{\pi} L_{tiny}(l)(n\cdot l)d_{\omega_i}$$

由于$l_c = n$且$\varepsilon \rightarrow 0$,因此可以假定$(n\cdot l) = 1$

$$\Rightarrow c_{light} = \lim_{\varepsilon \rightarrow 0}(\frac{1}{\pi}\int_\Omega L_{tiny}(l)d_{\omega_i})$$

$$\Rightarrow \lim_{\varepsilon \rightarrow 0}(\int_\Omega L_{tiny}(l)d_{\omega_i}) = \pi c_{light}$$

接下来将其代入通用的BRDF:
$$L_o(v) = \lim_{\varepsilon \rightarrow 0}(\int_\Omega f(l,v)\otimes L_{tiny}(l)(n\cdot l)d_{\omega_i} = f(l_c,v)\otimes \lim_{\varepsilon \rightarrow 0}(\int_\Omega L_{tiny}(l)d_{\omega_i})(n\cdot l_c)$$

$$\Rightarrow L_o(v) = \pi f(l_c,v)\otimes c_{light}(n\cdot l_c)\tag{1}$$

式(1)即为精确光源的反射方程

## Lambert光照实现

Lambert的BRDF为$\frac{c_d}{\pi}$,代入(1)式:
$$\Rightarrow L_o(v) = \pi \frac{c_d}{\pi}\otimes c_{light}(n \cdot l_c) = c_d \otimes c_{light}(n \cdot l_c)$$

# Reference
- [Physically-Based Shading Models in Film and Game Production][1]
- [PI or not to PI in game lighting equation][2]

[1]: http://renderwonk.com/publications/s2010-shading-course/hoffman/s2010_physically_based_shading_hoffman_a_notes.pdf
[2]: https://seblagarde.wordpress.com/2012/01/08/pi-or-not-to-pi-in-game-lighting-equation/