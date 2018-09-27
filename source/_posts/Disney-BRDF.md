---
title: Disney BRDF
date: 2018-09-09 17:51:55
tags: Rendering
categories: Rendering
---

# Disney Diffuse BRDF

该模型为经验模型,目的是根据材质的roughness表现的不同,平滑的表面更暗一些,粗糙的表面亮一些<!-- more -->:
$$f_d = \frac{baseColor}{\pi}(1 + (F_{D90} - 1)(1 - cos\theta_l)^5)(1 + (F_{D90} - 1)(1 - cos\theta_v)^5)$$

$$F_{D90} = 0.5 + 2\times roughness \times cos^2\theta_d$$

```cpp
float3 diffuse(float roughness, float LdotH, float NdotL, float NdotV, float3 BaseColor)
{
    float FresnelDiffuse = 0.5 + 2 * sqr(LdotH) * roughness;
    float fresnelL = 1 + (fresnelDiffuse - 1) * pow(1 - NdotL, 5);
    float fresnelV = 1 + (fresnelDiffuse - 1) * pow(1 - NdotV, 5);
    float3 Fd = (BaseColor / PI) * fresnelL * fresnelV;
    return Fd;
}
```