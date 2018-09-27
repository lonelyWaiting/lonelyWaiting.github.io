---
title: unity _WorldSpaceLightDir in forwardBase lightMode
date: 2018-09-08 22:07:32
tags: Unity
categories: Unity
---

# 现象

将方向光的旋转全部设为0，此时方向光朝向`+Z`,因此方向光的朝向为`(0,0,1)`<!-- more -->
![scene](/resources/images/unity-WorldSpaceLightDir-in-forwardBase-lightMode/scene.png)

代码如下:
```cpp
Shader "Custom/Test"
{
	Properties
	{
	}
	SubShader
	{
		Pass
		{
			CGPROGRAM
			#pragma vertex vert
			#pragma fragment frag
			
			#include "UnityCG.cginc"

			struct appdata
			{
				float4 pos : POSITION;
			};

			struct v2f
			{
				float4 pos      : SV_POSITION;
				float3 worldPos    : TEXCOORD1;
			};

			v2f vert (appdata v)
			{
				v2f o;
				o.pos         = UnityObjectToClipPos(v.pos);
				o.worldPos    = mul(unity_ObjectToWorld, v.pos);
				return o;
			}
			
			fixed4 frag (v2f i) : SV_Target
			{
				return float4(UnityWorldSpaceLightDir(i.worldPos), 1.0f);
			}
			ENDCG
		}
	}
}
```
此时渲染结果为一个蓝色的鸭子
![TurnOff LightMode Render Result](/resources/images/unity-WorldSpaceLightDir-in-forwardBase-lightMode/blue_duck.png)

当加上`Tags { "LightMode" = "ForwardBase" }`后:
```cpp
Shader "Custom/Test"
{
	Properties
	{
	}
	SubShader
	{
		Pass
		{
			Tags { "LightMode" = "ForwardBase" }

			CGPROGRAM
			#pragma vertex vert
			#pragma fragment frag
			
			#include "UnityCG.cginc"

			struct appdata
			{
				float4 pos : POSITION;
			};

			struct v2f
			{
				float4 pos      : SV_POSITION;
				float3 worldPos    : TEXCOORD1;
			};

			v2f vert (appdata v)
			{
				v2f o;
				o.pos         = UnityObjectToClipPos(v.pos);
				o.worldPos    = mul(unity_ObjectToWorld, v.pos);
				return o;
			}
			
			fixed4 frag (v2f i) : SV_Target
			{
				return float4(UnityWorldSpaceLightDir(i.worldPos), 1.0f);
			}
			ENDCG
		}
	}
}
```
此时渲染结果为一只黑色的鸭子:
![TurnOn LightMode Render Result](/resources/images/unity-WorldSpaceLightDir-in-forwardBase-lightMode/black_duck.png)

# 原因

用`RenderDoc`剖析一下,打开`ForwardBase`时:
![turnon forwardbase shader disassembly](/resources/images/unity-WorldSpaceLightDir-in-forwardBase-lightMode/turnon_forwardbase_shader_disassembly.png)

关闭`ForwardBase`后:
![turnoff forwardbase shader disassembly](/resources/images/unity-WorldSpaceLightDir-in-forwardBase-lightMode/turnoff_forwardbase_shader_disassembly.png)

可见在设置`LightMode`为`ForwardBase`时,`CB`中传入的光方向发生了反转
经过测试，当`LightMode`为`ForwardAdd`时,`CB`中传入的光方向也被反转了