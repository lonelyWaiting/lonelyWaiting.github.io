---
title: perlin-noise
date: 2019-04-13 23:44:21
tags: Noise
---


# 算法过程

- 设置晶格点,如以整数位置为晶格点

- 为每个晶格点设定一个梯度值

- 计算当前采样点位于哪些晶格点内部

- 计算晶格点到采样点的向量,并与晶格点的梯度点乘

- 将与各个晶格点的计算结果做插值,二维噪声就做个双线性插值

<!-- more -->

# 实现

```cpp
float perlin_noise(float2 pos)
{
    // compute lattice point
    int2 p00 = floor(pos);
    int2 p01 = p00 + int2(0, 1);
    int2 p10 = p00 + int2(1, 0);
    int2 p11 = p00 + int2(1, 1);

    float2 lerp_factor = pos - p00;

    float2 gradient00 = compute_gradient(p00);
    float2 gradient01 = compute_gradient(p01);
    float2 gradient10 = compute_gradient(p10);
    float2 gradient11 = compute_gradient(p11);

    float v00 = dot(pos - (float2)p00, gradient00);
    float v01 = dot(pos - (float2)p01, gradient01);
    float v10 = dot(pos - (float2)p10, gradient10);
    float v11 = dot(pos - (float2)p11, gradient11);

    float v0 = lerp(v00, v01, lerp_factor.y);
    float v1 = lerp(v10, v11, lerp_factor.y);
    float v  = lerp(v0, v1, lerp_factor.x);

    return v;
}
```

# Reference

[Perlin Noise](https://en.wikipedia.org/wiki/Perlin_noise)