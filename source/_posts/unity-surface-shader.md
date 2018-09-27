---
title: unity surface shader
date: 2018-09-09 00:25:40
tags: Unity
categories: Unity
---

# Flow
![surface shader flow](/resources/images/unity_surface_shader/surface_shader_flow.png)<!-- more -->

# Code Structure
```cpp
Shader "xxx"
{
    Properties
    {
        ...
    }
    SubShader
    {
        Tags {...}
        LOD ...

        CGPROGRAM
        #pragma surface <Surface Function> <LightingModel> [options]

        struct <Input Struct>
        {
            ...
        };

        UNITY_INSTANCING_BUFFER_START(Props)
        UNITY_INSTANCING_BUFFER_END(Props)

        void <surface function name>(<Input Struct> IN, inout <SurfaceOutput> o)
        {
            ...
        }
        ENDCG
    }
    FallBack "Diffuse"
}
```
`#pragma surface <Surface Function> <LightingModel> [options]`中指定了`surface`函数名以及光照模型
光照模型封装好了顶点着色器以及像素着色器,`surface`函数填充`<SurfaceOutput>`结构,然后用于光照计算

由于对于确定的光照模型而言,所需的数据以及计算流程都是固定的，因此可以直接封装起来
然后将`SurfaceOutput`的填充交给开发者来做

也可以自己定义顶点着色器,如:
```cpp
#pragma surface surf Lambert vertex:vert
```
指定函数`vert`为顶点着色器,`surf`为`surface`函数,光照模型为`Lambert`

# BlinnPhong Surface Analysis

示例实现:
```cpp
Shader "Custom/SurfaceShaderBlinnPhong" 
{
    Properties 
    {
        _Color ("Color", Color) = (1,1,1,1)
        _MainTex ("Albedo (RGB)", 2D) = "white" {}
        _SpecColor ("Specular Material Color", Color) = (1,1,1,1)
        _Shininess ("Shininess", Range (0.03, 1)) = 0.078125
    }
    SubShader 
    {
        Tags { "RenderType"="Opaque" }
        LOD 200

        CGPROGRAM
        #pragma surface surf BlinnPhong fullforwardshadows
        #pragma target 3.0

        sampler2D _MainTex;
        float _Shininess;

        struct Input 
        {
            float2 uv_MainTex;
        };
        
        UNITY_INSTANCING_BUFFER_START(Props)
            // put more per-instance properties here
        UNITY_INSTANCING_BUFFER_END(Props)

        void surf (Input IN, inout SurfaceOutput o) 
        {
            fixed4 c = tex2D (_MainTex, IN.uv_MainTex) * _Color;
            o.Albedo = c.rgb;
            o.Specular = _Shininess;
            o.Gloss = c.a;
            o.Alpha = 1.0f;
        }
        ENDCG
    }
    FallBack "Diffuse"
}

```
`BlinnPhong`光照模型的实现可以在`Lighting.cginc`中找到,其中实现了四个函数:
- LightingBlinnPhong
- LightingBlinnPhong_Deferred
- LightingBlinnPhong_GI
- LightingBlinnPhong_PrePass

## LightingBlinnPhong
`LightingBlinnPhong`的实现如下:
```cpp
inline fixed4 UnityBlinnPhongLight (SurfaceOutput s, half3 viewDir, UnityLight light)
{
    half3 h = normalize (light.dir + viewDir);

    fixed diff = max (0, dot (s.Normal, light.dir));

    float nh = max (0, dot (s.Normal, h));
    float spec = pow (nh, s.Specular*128.0) * s.Gloss;

    fixed4 c;
    c.rgb = s.Albedo * light.color * diff + light.color * _SpecColor.rgb * spec;
    c.a = s.Alpha;

    return c;
}

inline fixed4 LightingBlinnPhong (SurfaceOutput s, half3 viewDir, UnityGI gi)
{
    fixed4 c;
    c = UnityBlinnPhongLight (s, viewDir, gi.light);

    #ifdef UNITY_LIGHT_FUNCTION_APPLY_INDIRECT
        c.rgb += s.Albedo * gi.indirect.diffuse;
    #endif

    return c;
}
```
其中`SurfaceOutput`的定义也可以在`Lighting.cginc`中找到
```cpp
struct SurfaceOutput 
{
    fixed3 Albedo;
    fixed3 Normal;
    fixed3 Emission;
    half Specular;
    fixed Gloss;
    fixed Alpha;
};
```
`UnityGI`与`UnityLight`的定义在`UnityLightingCommon.cginc`中找到:
```cpp
struct UnityLight
{
    half3 color;
    half3 dir;
    half  ndotl; // Deprecated: Ndotl is now calculated on the fly and is no longer stored. Do not used it.
};

struct UnityIndirect
{
    half3 diffuse;
    half3 specular;
};

struct UnityGI
{
    UnityLight light;
    UnityIndirect indirect;
};
```