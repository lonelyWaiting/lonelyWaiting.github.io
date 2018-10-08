---
title: Color and Radiometry
date: 2018‎-01‎-04‎ 21:29:49
tags: [Rendering]
---

# 可见光
人眼的可见光波谱范围约为370nm~730nm

蓝光：400nm,绿光：550nm,红光：650nm
<!-- more -->

# 光谱表示

SPD(spectral power distribution): 光谱功率分布

SPD是一个关于波长的函数，通常是做法是找到一组基函数，用于将无限维度的SPD映射到低纬度空间表示

```cpp
template<int nSamples>
class CoefficientSpecturm
{
public:
	<CoefficientSpecturm public method>
protected:
	<CoefficientSpecturm protected data>
};
```
```cpp
<CoefficientSpecturm protected data> =
	float c[nSamples];
```

接下来介绍两种常用的表示方法

## SampleSpectrum
这种方法是将光谱重新均匀采样来进行拟合

考虑波长为400nm~700nm的可见光，可以将区间分为N段，以30段为例，通常足以拟合比较复杂的光谱数据
![sample construct](/resources/images/Color-And-Radiometry/spectrum.png)

```cpp
<Spectrum Utility Declarations> =
	static const int sampledLambdaStart = 370;
	static const int sampledLambdaEnd   = 700;
	static const int nSpectralSamples   = 30;

<Spectrum Declarations> =
	class SampledSpectrum : public CoefficientSpectrum<nSpectralSamples>
	{
		public:
			<SampledSpectrum public Methods>
		private:
			<SampledSpectrum Private Data>
	};
```

**那么如何从一组光谱数据来构造光谱表示?**

假设现在有一组光谱数据$(\lambda_i,v_i)$，表示第$i$个采样点的波长为$\lambda_i$，值为$v_i$,这些采样点往往分布不均匀

对于给定的一组光谱数据，可以构造出相应的折线图

然后将此折线图划分为30个区域，如上图：[400,410) , [410,420)....[690,700)

计算每个区域覆盖的面积和，求其平均值，得到新的采样值

```cpp
static SampledSpectrum FromSampled(const float* lambda , const float* v , int n)
{
	<Sort samples if unordered, use sorted for returned spectrum>
	
	SampledSpectrum r;
	for(int i = 0; i < nSpectralSamples; i++)
	{
		<Compute average value of given SPD over ith sample's range>
	}
}```

```cpp
<Compute average value of given SPD over ith sample's range>=
	// compute ith sample's range
	float lambda0 = Lerp(float(i) / float(nSpectralSamples) , sampledLambdaStart , sampledLambdaEnd);
	float lambda1 = Lerp(float(i+1) / float(nSpectralSamples) , sampledLambdaStart , sampledLambdaEnd);
	r.c[i] = AverageSpectrumSamples(lambda, v, n, lambda0, lambda1);
```

```cpp
<Spectrum Method Definitions> = 
	float AverageSpectrumSamples(const float* lambda , const float* vals , int n , 
								 float lambdaStart , float lambdaEnd)
	{
		<handles case with out-of bounds range or single sample only>
		float sum = 0.0f;
		<Add contribute of constant segments before/after samples>
		<Advance to first relevant wavelength , segment>
		<Loop over wavelength sample segments and add contributes>
		return sum / (lambdaEnd - lanbdaStart);
	}
```

处理边界条件：数据的波长范围全部处于区间之外，或者原始数据只有一个采样点
```cpp
<handles case with out-of bounds range or single sample only> =
	if(lambdaEnd <= lambda[0]) return lambda[0];
	if(lambdaStart >= lambda[n - 1]) return lambda[n - 1];
	if(n == 1) return lambda[0];
```

对于处于数据之外的区域，将其值视为常量,即区域为方形
```cpp
<Add contribute of constant segments before/after samples> =
	if(lambdaStart < lambda[0])  
		sum += vals[0] * (lambda[0] - lambdaStart);
	if(lambdaEnd > lambda[n - 1]) 
		sum += vals[n - 1] * (lambdaEnd - lambda[n - 1]);
```

找到区间起始波长所在的数据段
```cpp
<Advance to first relevant wavelength , segment> =
	int i = 0;
	while(lambdaStart > lambeda[i+1]) ++i;
```
计算区域覆盖的梯形面积和
```cpp
<Loop over wavelength sample segments and add contributes>
	#define INTERP(w,i)\
		Lerp(((w) - lambda[(i)]) / (lambda[(i) + 1] - lambda[(i)]) , vals[(i)] , vals[(i) + 1])
	#define SEG_AVG(wl0,wl1,i) (0.5f * (INTERP(wl0,i) + INTERP(wl1,i)))
	for(; i+1 < n && lambdaEnd >= lambda[i]; i++)
	{
		float segStart = max(lambdaStart , lambda[i]);
		float segEnd   = min(lambdaEnd , lambda[i+1]);
		sum += SEG_AVG(segStart,segEnd,i) * (segEnd - segStart);
	}
	#undef INTERP
	#undef SEG_AVG
```

经过以上步骤，将光谱数据拟合为线性分段函数，然而，最终我们需要将光谱转化为RGB才能在显示器上显示出来

三色刺激理论认为所有人眼可视的SPD都可以精确的使用三个值$(x_\lambda,y_\lambda,z_\lambda)$表示,公式如下：

$$x_\lambda = \frac{1}{\int Y(\lambda)d\lambda}\int_\lambda S(\lambda)X(\lambda)d\lambda$$

$$y_\lambda = \frac{1}{\int Y(\lambda)d\lambda}\int_\lambda S(\lambda)Y(\lambda)d\lambda$$

$$z_\lambda = \frac{1}{\int Y(\lambda)d\lambda}\int_\lambda S(\lambda)Z(\lambda)d\lambda$$

$X(\lambda),Y(\lambda),Z(\lambda)$为光谱匹配曲线,是由国际照明委员会经过一系列实验制定的.

这三条曲线被认为与人类视网膜的三种感色视椎体细胞响应类似
![spectral matching curves](/resources/images/Color-And-Radiometry/spectral_matching_curves.png)

两个由多种不同波长的光混合而成的光源可以表现出同样的颜色，这叫做“异谱同色”(metamerism)

尽管对于人类观察者而言，XYZ可以很好的表示SPD，然而对于光谱计算并不是一种好的方案

XYZ的乘积与SPD的乘积再计算得到的XYZ相差很大

在SampledSpectrum中，SPD将会被变换重采样进行降维，因此，光谱匹配曲线也需要在重采样到相同维度才能进行运算
```cpp
<Spectral Data Declarations> =
	static const int nCIESamples = 471;
	extern const float CIE_X[nCIESamples];
	extern const float CIE_Y[nCIESamples];
	extern const float CIE_Z[nCIESamples];
	extern const float CIE_lambda[nCIESamples];
```
CIE_lambda中记录的是每个采样点的波长，这里使用1nm为步长，CIE_X,Y,Z记录从360nm~830nm的光谱匹配曲线采样点

```cpp
<SampledSpectrum Private Data> =
	static SampledSpectrum X , Y , Z;
	static float yInt;
```
由于光谱匹配曲线是固定的，因此使用static变量

XYZ匹配曲线计算放在初始化函数中，当程序启动时进行调用
```cpp
<SampledSpectrum Public Methods> += 
	static void Init()
	{
		<Compute XYZ matching functions for SampledSpectrum>
		<Compute RGB to spectrum functions for SampledSpectrum>
	}
```
```cpp
<Compute XYZ matching functions for SampledSpectrum> =
	for(int i = 0; i < nSpectralSamples; i++)
	{
		float wl0 = Lerp(float(i) / float(nSpectrualSamples) , sampledLambdaStart , sampledLambdaEnd);
		float wl1 = Lerp(float(i+1) / float(nSpectrualSamples) , sampledLambdaStart , sampledLambdaEnd);
		X.c[i] = AverageSpectrumSamples(CIE_lambda, CIE_X, nCIESamples, wl0, wl1);
		Y.c[i] = AverageSpectrumSamples(CIE_lambda, CIE_Y, nCIESamples, wl0, wl1);
		Z.c[i] = AverageSpectrumSamples(CIE_lambda, CIE_Z, nCIESamples, wl0, wl1);
		yInt += Y.c[i];
	}
```

现在我们有了XYZ匹配曲线的重采样数据，公式可以转化为用黎曼和表示:

$$x_\lambda \approx \frac{1} {\int Y(\lambda)d\lambda} \sum_i X_i c_i$$

$$y_\lambda \approx \frac{1} {\int Y(\lambda)d\lambda} \sum_i Y_i c_i$$

$$z_\lambda \approx \frac{1} {\int Y(\lambda)d\lambda} \sum_i Z_i c_i$$

```cpp
<SampledSpectrum Public Methods> +=
	void ToXYZ(float xyz[3]) const
	{
		xyz[0] = xyz[1] = xyz[2] = 0.0f;
		for(int i = 0; i < nSpectralSamples; i++)
		{
			xyz[0] += X.c[i] * c[i];
			xyz[1] += Y.c[i] * c[i];
			xyz[2] += Z.c[i] * c[i];
		}
		
		xyz[9] /= yInt;
		xyz[1] /= yInt;
		xyz[2] /= yInt;
	}
```

XYZ中的y与亮度密切相关.
```cpp
<SampledSpectrum public Methods> += 
	float y() const
	{
		float yy = 0.0f;
		for(int i = 0; i < nSpectralSamples; i++)
		{
			yy += Y.c[i] * c[i];
		}
		return yy / yInt;
	}
```

**现在我们已经将SPD转换为了XYZ,那么如何将XYZ转化为RGB用于显示呢？**

当我们将RGB显示在显示器上时，真实显示的光谱主要由三色光谱响应曲线的加权和确定.，由发光材料决定

LED,LCD,以及等离子体的三色光谱响应曲线不同，因此相同的SPD,在这三种情况下显示出来的RGB是不同的.
![spectral response curves](/resources/images/Color-And-Radiometry/spectral_response_curves.png)

在LCD,LED显示RGB(0.6,0.3,0.2)的光谱分别如下图所示：
![SPD from display same rgb](/resources/images/Color-And-Radiometry/SPDs_from_Displaying_Same_RGB.png)

可见SPD相差很大.因此，RGB作为颜色只在知道显示器属性的情况下才是有意义的.

给定一个SPD的$x_{\lambda},y_\lambda,z_\lambda$

在给定显示器的情况下,也就是给定三色光谱响应曲线$$R(\lambda),G(\lambda),B(\lambda)$$

RGB按照如下公式计算所得：

$$
\begin{align}
r = \int R(\lambda)S(\lambda)d\lambda &= \int R(\lambda)(x_\lambda X(\lambda) + y_\lambda Y(\lambda) + z_\lambda Z(\lambda))d\lambda \notag\\\\
									  &=x_\lambda \int R(\lambda)X(\lambda)d\lambda + y_\lambda \int R(\lambda)Y(\lambda)d\lambda + z_\lambda \int R(\lambda) Z(\lambda)d\lambda\notag
\end{align}
$$

$$
\begin{bmatrix}
    r \\\\
    g \\\\
    b
\end{bmatrix}
= 
\begin{bmatrix}
    \int R(\lambda)X(\lambda)d\lambda  & \int R(\lambda)Y(\lambda)d\lambda & \int R(\lambda)Z(\lambda)d\lambda\\\\
    \int G(\lambda)X(\lambda)d\lambda  & \int G(\lambda)Y(\lambda)d\lambda & \int G(\lambda)Z(\lambda)d\lambda \\\\
    \int B(\lambda)X(\lambda)d\lambda  & \int B(\lambda)Y(\lambda)d\lambda & \int B(\lambda)Z(\lambda)d\lambda
\end{bmatrix}
\begin{bmatrix}
    x_\lambda \\\\
    y_\lambda \\\\
    z_\lambda
\end{bmatrix}
$$

对于高清电视而言：
$$
\begin{bmatrix}
    r \\\\
    g \\\\
    b
\end{bmatrix}
 = 
\begin{bmatrix}
    3.240479  & -1.537150 & -0.498535\\\\
    -0.969256  & 1.875991 & 0.041556 \\\\
    0.055648  & -0.204043 & 1.057311
\end{bmatrix}
\begin{bmatrix}
    x_\lambda \\\\
    y_\lambda \\\\
    z_\lambda
\end{bmatrix}
$$

**计算得到的RGB是在linear space,需要Gamma矫正才能变换到sRGB空间**

```cpp
<Spectrum Utility Declarations> +=
	inline void XYZToRGB(const float xyz[3] , float rgb[3])
	{
		rgb[0] = 3.240479 * xyz[0] - 1.537150 * xyz[1] - 0.498535 * xyz[2];
		rgb[1] =-0.969256 * xyz[0] + 1.875991 * xyz[1] + 0.041556 * xyz[2];
		rgb[2] = 0.055648 * xyz[0] - 0.204043 * xyz[1] + 1.057311 * xyz[2];
	}
```

逆矩阵可以将RGB转为XYZ
```cpp
<Spectrum Utility Declarations> +=
	inline void RGBToXYZ(const float rgb[3], float xyz[3])
	{
		xyz[0] = 0.412453 * rgb[0] + 0.357580 * rgb[1] + 0.180423 * rgb[2];
		xyz[1] = 0.212671 * rgb[0] + 0.715160 * rgb[1] + 0.072169 * rgb[2];
		xyz[2] = 0.019334 * rgb[0] + 0.119193 * rgb[1] + 0.950227 * rgb[2];
	}
```

因此将SPD转为RGB:
```cpp
<SampledSpectrum Public Methods> +=
	void ToRGB(flaot rgb[3]) const
	{
		float xyz[3];
		ToXYZ(xyz);
		XYZToRGB(xyz,rgb);
	}
```

介绍完了如何使用SPD计算RGB，那么**如何通过RGB得到SPD?**

通过测量得到以下数据
```cpp
<Spectrual Data Declaration> +=
	static const int nRGB2SpectSamples = 32;
	extern const float RGB2SpectLambda[nRGB2SpectSamples];
	extern const float RGBRefl2SpectWhite[nRGB2SpectSamples];
	extern const float RGBRefl2SpectCyan[nRGB2SpectSamples];
	extern const float RGBRefl2SpectMagenta[nRGB2SpectSamples];
	extern const float RGBRefl2SpectYellow[nRGB2SpectSamples];
	extern const float RGBRefl2SpectRed[nRGB2SpectSamples];
	extern const float RGBRefl2SpecGreen[nRGB2SpectSamples];
	extern const float RGBRefl2SpectBlue[nRGB2SpectSamples];

	extern const float RGBIllum2SpectWhite[nRGB2SpectSamples];
	extern const float RGBIllum2SpectCyan[nRGB2SpectSamples];
	extern const float RGBIllum2SpectMagenta[nRGB2SpectSamples];
	extern const float RGBIllum2SpectYellow[nRGB2SpectSamples];
	extern const float RGBIllum2SpectRed[nRGB2SpectSamples];
	extern const float RGBIllum2SpectGreen[nRGB2SpectSamples];
	extern const float RGBIllum2SpectBlue[nRGB2SpectSamples];
```
如果RGB颜色用于描述光源的发射光，那么应该使用表示发射源的光谱能量分布的转换表进行计算.

RGBillum2Spect\*使用的是D65光谱能量分布，为CIE用于表示正午日光的标准.

用于计算方便，可以将RGBRefl2Spect\*,RGBillum2Spect\*分布，在初始化阶段重采样为SampledSpectrum
```cpp
<SampledSpectrum Private Data>
	static SampledSpectrum rgbRelf2SpectWhite;
	static SampledSpectrum rgbRelf2SpectCyan;
	static SampledSpectrum rgbRelf2SpectMagenta;
	static SampledSpectrum rgbRelf2SpectYellow;
	static SampledSpectrum rgbRelf2SpectRed;
	static SampledSpectrum rgbRelf2SpectGreen;
	static SampledSpectrum rgbRelf2SpectBlue;

	static SampledSpectrum rgbIllum2SpectWhite;
	static SampledSpectrum rgbIllum2SpectCyan;
	static SampledSpectrum rgbIllum2SpectMagenta;
	static SampledSpectrum rgbIllum2SpectYellow;
	static SampledSpectrum rgbIllum2SpectRed;
	static SampledSpectrum rgbIllum2SpectGreen;
	static SampledSpectrum rgbIllum2SpectBlue;
```

```cpp
<Compute RGB to spectrum functions for SampledSpectrum> =
	float wl0 = Lerp(float(i) / float(nSpectralSamples),sampledLambdaStart, sampledLambdaEnd);
    float wl1 = Lerp(float(i+1) / float(nSpectralSamples),sampledLambdaStart, sampledLambdaEnd);
    rgbRefl2SpectWhite.c[i] = AverageSpectrumSamples(RGB2SpectLambda, RGBRefl2SpectWhite,
        nRGB2SpectSamples, wl0, wl1);
    rgbRefl2SpectCyan.c[i] = AverageSpectrumSamples(RGB2SpectLambda, RGBRefl2SpectCyan,
        nRGB2SpectSamples, wl0, wl1);
    rgbRefl2SpectMagenta.c[i] = AverageSpectrumSamples(RGB2SpectLambda, RGBRefl2SpectMagenta,
        nRGB2SpectSamples, wl0, wl1);
    rgbRefl2SpectYellow.c[i] = AverageSpectrumSamples(RGB2SpectLambda, RGBRefl2SpectYellow,
        nRGB2SpectSamples, wl0, wl1);
    rgbRefl2SpectRed.c[i] = AverageSpectrumSamples(RGB2SpectLambda, RGBRefl2SpectRed,
        nRGB2SpectSamples, wl0, wl1);
    rgbRefl2SpectGreen.c[i] = AverageSpectrumSamples(RGB2SpectLambda, RGBRefl2SpectGreen,
        nRGB2SpectSamples, wl0, wl1);
    rgbRefl2SpectBlue.c[i] = AverageSpectrumSamples(RGB2SpectLambda, RGBRefl2SpectBlue,
        nRGB2SpectSamples, wl0, wl1);

    rgbIllum2SpectWhite.c[i] = AverageSpectrumSamples(RGB2SpectLambda, RGBIllum2SpectWhite,
        nRGB2SpectSamples, wl0, wl1);
    rgbIllum2SpectCyan.c[i] = AverageSpectrumSamples(RGB2SpectLambda, RGBIllum2SpectCyan,
        nRGB2SpectSamples, wl0, wl1);
    rgbIllum2SpectMagenta.c[i] = AverageSpectrumSamples(RGB2SpectLambda, RGBIllum2SpectMagenta,
        nRGB2SpectSamples, wl0, wl1);
    rgbIllum2SpectYellow.c[i] = AverageSpectrumSamples(RGB2SpectLambda, RGBIllum2SpectYellow,
        nRGB2SpectSamples, wl0, wl1);
    rgbIllum2SpectRed.c[i] = AverageSpectrumSamples(RGB2SpectLambda, RGBIllum2SpectRed,
        nRGB2SpectSamples, wl0, wl1);
    rgbIllum2SpectGreen.c[i] = AverageSpectrumSamples(RGB2SpectLambda, RGBIllum2SpectGreen,
        nRGB2SpectSamples, wl0, wl1);
    rgbIllum2SpectBlue.c[i] = AverageSpectrumSamples(RGB2SpectLambda, RGBIllum2SpectBlue,
        nRGB2SpectSamples, wl0, wl1);
```

RGB转Spectrum

$$if \quad r < g < b$$

$$(r,g,b) = (r,r,r)+(0,g-r,g-r)+(0,0,b-g)=r(1,1,1)+(g-r)(0,1,1)+(b-g)(0,0,1)$$

$$if \quad r < b < g$$

$$(r,g,b)=(r,r,r)+(0,b-r,b-r)+(0,g-b,0)=r(1,1,1)+(b-r)(0,1,1)+(g-b)(0,1,0)$$

...

(1,1,1):White

(0,1,1):Cyan

(0,0,1):Blue

(0,1,0):Green

```cpp
<Spectrum Utility Declaration> +=
	enum SpectrumType {SPECTRUM_REFLECTANCE, SPECTRUM_ILLUMINANT};

<Spectrum Method Definitions> +=
	SampledSpectrum SampledSpectrum::FromRGB(const float rgb[3] , SpectrumType type)
	{
		SampledSpectrum r;
		if(type == SPECTRUM_REFLECTANCE)
		{
			<Convert reflectance spectrum to RGB>
		}
		else
		{
			<Convert illuminant spectrum to RGB>
		}
		return r.Clamp();
	}

<Convert reflectance spectrum to RGB> =
	if(rgb[0] <= rgb[1] && rgb[0] <= rgb[2])
	{
		<Compute reflectance SampledSpectrum with rgb[0] as minimum>
	}
	else if(rgb[1] <= rgb[0] && rgb[1] <= rgb[2])
	{
		<Compute reflectance SampledSpectrum with rgb[1] as minimum>
	}
	else
	{
		<Compute reflectance SampledSpectrum with rgb[2] as minimum>
	}

<Compute reflectance SampledSpectrum with rgb[0] as minimum> =
	r += rgb[0] * rgbRefl2SpectWhite;
	if(rgb[1] <= rgb[2])
	{
		r += (rgb[1] - rgb[0]) * rgbRefl2SpectCyan;
		r += (rgb[2] - rgb[1]) * rgbRefl2SpectBlue;
	}
	else
	{
		r += (rgb[2] - rgb[0]) * rgbRefl2SpectCyan;
		r += (rgb[1] - rgb[2]) * rgbRefl2SpectGreen;
	}
```

## RGBSpectrum
RGBSpectrum使用R,G,B分量的加权和来表示SPDs

```cpp
<Spectrum Declarations> +=
	class RGBSpectrum : public CofficientSpectrum<3>
	{
		public:
			<RGBSpectrum Public Methods>
	};
```

FromRGB这个函数就简单了，因此我们存储的就是rgb
```cpp
<RGBSpectrum Public Methods> +=
	static RGBSpectrum FromRGB(const float rgb[3], SpectrumType type = SPECTRUM_REFLECTION)
	{
		RGBSpectrum s;
		s.c[0] = rgb[9];
		s.c[1] = rgb[1];
		s.c[2] = rgb[2];
		return s;
	}
<RGBSpectrum Public Methods> +=
	void TOrgb(float* rgb) const
	{
		rgb[0] = c[0];
		rgb[1] = c[1];
		rgb[2] = c[2];
	}
```

根据SPD计算RGB,通过光谱匹配函数计算XYZ,然后XYZ转为RGB
```cpp
<RGBSpectrum Public Methods> +=
	static RGBSpectrum FromSampled(const float* lambda, const float* v, int n)
	{
		float xyz[3] = {0,0,0};
		float yint = 0.0f;
		for(int i = 0; i < nCIESamples; i++)
		{
			yint += CIE_Y[i];
			float val = InterpolateSpectrumSamples(lambda, v, n, CIE_lambda[i]);
			xyz[0] += val * CIE_X[i];
			xyz[1] += val * CIE_Y[i];
			xyz[2] += val * CIE_Z[i];
		}
		
		xyz[0] /= yint;
		xyz[1] /= yint;
		xyz[2] /= yint;

		return FromXYZ(xyz);
	}

<Spectrum Method Definitions> +=
	float InterpolateSpectrumSamples(const float* lambda, const float* vals, int n, float l)
	{
		if(l <= lambda[0]) return vals[0];
		if(l >= lambda[n-1]) return vals[n-1];
		for(int i=0; i < n-1; i++)
		{
			if(l >= lambda[i] && l <= lambda[i+1])
			{
				float t = (l - lambda[i]) / (lambda[i+1] - lambda[i]);
				return Lerp(t , vals[i] , vals[i+1]);
			}
		}
	}
```

## LinearSpace RGB to sRGB
$$
\begin{equation}
C_{srgb}=
\begin{cases}
12.92C_{linear} & C_{linear} \leq 0.0031308 \notag\\\\[2ex]
(1+\alpha)C_{linear}^{\frac{1}{2.4}} - \alpha & C_{linear} > 0.0031308
\end{cases}
 \end{equation}
$$

# Reference
- [sRGB](https://en.wikipedia.org/wiki/SRGB)
- [PBRT](http://www.pbrt.org/)