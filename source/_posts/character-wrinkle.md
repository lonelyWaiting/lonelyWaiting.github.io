---
title: character wrinkle
date: 2017-11-20 00:10:56
tags:
---

# 简介

将表情与区域掩码相关联,使用表情权重作为正常法线与皱纹法线的过渡权重
通过颜色值来区分皱纹区域
<!-- more -->

# 算法描述

- 根据表情与掩码的关联,计算出当帧每个皱纹区域的权重值
- 根据采样皱纹掩码图计算当前像素位于哪个皱纹区域并计算最终权重
- 使用权重值在原始法线与皱纹法线之间插值

``` cpp
cbuffer wrinkle_weight  : register(b0)
{
    float3 red_weights;
    float3 green_weights;
    float3 blue_weights;
    float3 alpha_weights;
};

Texture2D baseNormal    : register(t0);
Texture2D wrinkleMask   : register(t1);
Texture2D wrinkleNormal : register(t2);

SamplerState baseSampler    : register(s0);
SamplerState maskSampler    : register(s1);
SamplerState wrinkleSampler : register(s2);

float computeWeight(uint4 mask)
{
    int rIdx = mask.r / 90;
    int rOffset = value % 90;
    float rWeight = step(offset , 75) * clamp(offset * 0.014f , 0.0f , 1.0f) * red_Weight[rIdx];

    int gIdx = mask.g / 90;
    int gOffset = value % 90;
    float gWeight = step(offset , 75) * clamp(offset * 0.014f , 0.0f , 1.0f) * greend_weight[gIdx];

    int bIdx = mask.b / 90;
    int bOffset = value % 90;
    float bWeight = step(offset , 75) * clamp(offset * 0.014f , 0.0f , 1.0f) * blue_Weight[bIdx];

    int aIdx = mask.a / 90;
    int aOffset = value % 90;
    float aWeight = step(offset , 75) * clamp(offset * 0.014f , 0.0f , 1.0f) * alpha_Weight[aIdx];

    return max(rWeight , max(gWeight , max(bWeight , aWeight)));
}

PixelOut ps_main(PixelIn input)
{
    PixelOut out;

    float4 maskColor = wrinkleMask.Sample(maskSampler, input.texcoord);
    clip(maskColor.r + maskColor.g + maskColor.b + maskColor.a - 0.01f);

    uint4 uMask = maskColor * 255;
    float weight = computeWeight(uMask);

    clip(weight - 0.001f);

    float3 normalColor = baseNormal.Sample(baseSampler , input.texcoord);
    normalColor = NormalMapping(input.Normal, input.Tangent, input.Binormal, normalColor);

    float3 wrinkleNormalColor = wrinkleNormal.Sample(wrinkleSampler,input.Texcoord);
    wrinkleNormalColor = NormalMapping(input.Normal, input.Tangent, input.Binormal, wrinkleNormalColor);

    out.Normal = lerp(normalColor , wrinkleNormalColor , weight);

    return out;
}
```

# 掩码图资源制作

- 未压缩DDS
- 套索工具关闭抗锯齿
- 不使用颜色管理,避免`Gamma`的影响
- 边缘过渡使用内发光特效实现
- 掩码图尺寸使用$512\times 512$即可,不需太大
- BC3 Linear
- RGBA各三个颜色段:$0~75$,$90~165$,$180~255$

# 注意事项

- 掩码图点采样:`D3D11_FILTER_MIN_MAG_MIP_POINT`
- 掩码图不需要`MipMap`

# More Info
[CryEngine Wrinkle Map Tutorial](http://docs.cryengine.com/display/SDKDOC2/Wrinkle+Maps+Tutorial)