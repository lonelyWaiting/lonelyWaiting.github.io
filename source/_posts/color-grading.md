---
title: color grading
date: 2017-11-18 22:35:50
tags: [rendering]
---

# 简介

简化来说就是色阶到色阶的映射<!-- more -->

相比HSV调色等具有更强的表现力,可由美术进行色彩,对比度,亮暗等等方面的控制

# 适用场合

1. 用于做后处理,改变场景的风格
2. 换肤等

# 算法描述

`Color Grading`通过生成3D LUT(LookUp Texture)来实现颜色的映射

以正常计算所得的颜色值(0~1)作为3D纹理的纹理坐标,采样得到新的颜色值

我们以R8G8B8A8来存储LUT的话,256*256*256的查找表大小为64M.

因此,我们将其划分为32阶,也就是尺寸为32*32*32.大小为128k,实际应用中精度足够,内存占用也不大

## 生成色阶

首先需要一张包含32*32*32个色阶的2D纹理,可以将其存储在256*128的2D纹理中

![color Grading](/resources/images/color_grading/color_grading.bmp)

``` cpp
bool generate_grading(color* pixels, const bitmap_info& info, const cmd_config& cfg)
{
	int blue_stride = info.width / cfg.size;

	for (int row = 0; row < info.height; row++)
	{
		int g = row % 32;

		int offset = (int)(row / 32) * blue_stride;

		for(int col = 0; col < info.width; col++)
		{
			int r = col % 32;

			int b = offset + col / 32;

			auto& c = pixels[row * info.width + col];

			c.r = char(r * cfg.grading);
			c.g = char(g * cfg.grading);
			c.b = char(b * cfg.grading);
		}
	}

	return true;
}
```
## 调节图像

在PS中打开想要调节的图像,将上述的2D纹理置于右下角,合并图层,另存BMP至本地

对图像进行整体性调色,如HSV,对比度等等,调至满意为止,另存BMP至本地

## 生成映射表

现在,我们有两张BMP纹理(使用BMP主要是为了不对图像进行压缩),假设为`Base.bmp`和`Target.bmp`

`Base.bmp`右下角256*128的区域为原始色阶,`Target.bmp`右下角的258*128的区域为目标色阶

以原始色阶值为三维数组索引,目标色阶为元素值,可得到一个32*32*32的数组

将该数组写入3D纹理中,即得到最终的查找表

## 应用

shader中根据pixel shader中计算出的颜色值对该3D纹理进行采样,得到映射后的颜色值

# 注意事项

- 生成查找表纹理时,输入源必须是未压缩的,保证32*32*32每个元素都能填充值

- 3D查找纹理不需要生成MipMap

- 采用双线性采样,即`D3D11_Filter_MIN_MAG_LINEAR_MIP_POINT`

Reference:
[UE4 Color Grading](https://docs.unrealengine.com/latest/INT/Engine/Rendering/PostProcessEffects/ColorGrading/)