---
title: motion blur
date: 2018-01-09 00:06:34
tags: [Rendering]
---

motion blur用于表现速度感.一种很常用的后处理技术<!-- more -->

# 算法描述

- 根据深度图计算出每个像素的世界空间位置。
- 用前一帧的view-project矩阵进行变换,得到新的视口位置
- 根据当前帧与上一帧的视口位置，生成逐像素的速度值
- 沿着速度方向进行多重采样,结果进行平均

# 深度图提取物体位置

viewport position: $H = (\frac{x}{w}, \frac{y}{w}, \frac{z}{w} , 1)$

world-view-project matrix: M

$H \times M^{-1} = (\frac{X}{W}, \frac{Y}{W}, \frac{Z}{W}, W) = D$

world position: $WorldPos = \frac{D}{D.w}$

提取世界空间位置:
```cpp
float2 zOverW = tex2D(depthTexture, texCoord);
float4 H = float4(texCoord.x * 2 - 1, (1 - texCoord.y) * 2 - 1 , zOverw , 1);
float4 D = mul(H, g_ViewProjectionInverseMatrix);
float4 worldPos = D / D.w;
```

逐像素计算速度
```cpp
float4 currentPos = H;
float4 previousPos = mul(worldPos, g_previousViewProjectionMatrix);
previousPos /= previousPos.w;
float2 velocity = (currentPos - previousPos) / 2.0f;
```

# 实现emotion blur

沿着速度方向进行多重采样,并最终进行平均,得到最终的像素值
```cpp
float4 color = tex2D(sceneSampler, texCoord);
for(int i = 1; i < g_numSamples; ++i, texCoord += velocity)
{
    float4 currentColor = tex2D(sceneSampler, texCoord);
    color += currentColor;
}

float4 finalColor = color / g_numSamples;
```

# 动态物体

上面的算法考虑的是相机的运动，因此对于静态物体表现的很好

对于动态物体,需要记录物体在场景中的速度,可以单独生成一张速度图

可以通过当前帧与下一帧的view-projection矩阵变换物体,计算viewport的位置差异

# 屏蔽物体

如果想要屏蔽掉场景中的某些物体,以使motion blur不对其起作用

那么可以渲染一张mask纹理或者渲染到颜色图的alpha通道

# Reference

[GPU Gems 3 Emotion Blur](https://developer.nvidia.com/gpugems/GPUGems3/gpugems3_ch27.html)