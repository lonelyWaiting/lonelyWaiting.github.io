---
title: reflect and refraction
date: 2017-11-22
tags: [Rendering,Math]
---

### 方向计算

光线入射到在光滑的平面上，将会表现出反射与折射<!-- more -->

对于沿着给定方向$\omega_i$入射的光线，所有的光线都将沿着同一个方向$\omega_o$出射

对于镜面反射而言,入射角与反射角一致,即:$\theta_i = \theta_o$

![reflect](/resources/images/reflect_refraction/reflect.jpg)
入射角与反射角是指与法线的交点

折射满足*Snell's law*:$\eta_i \sin\theta_i = \eta_t sin\theta_t$

$\eta_i$和$\eta_t$分别为光线进入交界面前媒介的折射率以及进入交界面后媒介的折射率

$\theta_i$和$\theta_t$分别表示入射光与法线的夹角，折射光与法线的夹角

![refraction](/resources/images/reflect_refraction/refraction.jpg)

折射率是随着光的波长变换的，因此，在两种不同媒介的交界面处入射光将会沿着多个方向散射，即色散

但是其计算复杂，不予考虑

### 菲涅尔反射

刚介绍了如何计算反射方向和折射方向，那么入射光中有多少能量被反射，又有多少能量被折射呢？

菲涅尔方程描述了光被表面反射的比例，菲涅尔方程为麦克斯韦方程在平滑表面的解(写这句只为装逼~~)

需要说明的是，菲涅尔方程存在两种，一种是用于描述电解质媒介(不导电，如玻璃)，一种能够用于描述导体媒介(如金属)

对于每一种菲涅尔方程都存在两种形式，取决于入射光的偏振状态

渲染中考虑光的偏振比较复杂，因此不予考虑，我们假设入射光全是非偏振光

在该假定下，菲涅尔反射率为平行偏振分量的平方与垂直偏振分量的平方的平均值

以计算电介质的菲涅尔反射率为例，首先我们需要知道两中媒介的折射率

对于电介质而言，菲涅尔方程的一个近似表达如下:

$$r_\| = \frac{\eta_t \cos\theta_i - \eta_i\cos\theta_t}{\eta_t\cos\theta_i + \eta_i\cos\theta_t}$$

$$r_\bot = \frac{\eta_icos\theta_i - \eta_tcos\theta_t}{\eta_icos\theta_i + \eta_t\cos\theta_t}$$

- $r_\|$为平行偏振光的菲涅尔反射率
- $r_\bot$为垂直偏振光的反射率
- $\eta_i$为入射媒介的折射率
- $\eta_t$为折射媒介的折射率

折射率为光在真空中传播的速度除以光在该媒介中传播的速度

$\theta_i$为入射光$\omega_i$与法线的夹角

$\theta_t$为折射光$\omega_t$与法线的夹角，$\omega_t$由*Snell's law*计算得出

需要提醒的一点是$\cos\theta$必须大于或等于0

最后，对非偏振光而言，菲涅尔反射率为:$F_{r} = \frac{r_{\|}^{2} + r_{\bot}^{2}}{2}$

根据能量守恒，我们可以得出，电介质折射的能量比例为:$1 - F_r$

对于导体而言，导体是不会透射光的，但是会吸收部分光转换为热量。

对于导体的菲涅尔方程描述了多少光背反射，具体取决于导体的折射率$\eta$与吸收因子$k$

常用的导体的菲涅尔方程如下:

$$r_\|^2 = \frac{(\eta^2 + k^2)cos\theta_i^2 - 2\eta\cos\theta_i + 1}{(\eta^2 + k^2)cos\theta_i^2 + 2\eta\cos\theta_i + 1}$$

$$r_\bot^2 = \frac{(\eta^2 + k^2) - 2\eta\cos\theta_i + \cos\theta_i^2}{(\eta^2 + k^2) + 2\eta\cos\theta_i + \cos\theta_i^2}$$


### BRDF

接下来讲讲镜面反射和镜面折射的BRDF

由于菲涅尔方程给出了光被反射的量$F_r(\omega_i)$,因此：

$$L_o(\omega_o) = f_r(\omega_o , \omega_i)L_i(\omega_i) = F_r(\omega_i)L_i(\omega_i)$$

$\omega_i$为$\omega_o$关于表面法线的反射向量($\theta_i == \theta_o$,因此,$F_r(\omega_o)=F_r(\omega_i)$.)

该BRDF可以使用脉冲函数进行构造，因为对于任意一个方向的入射光，只有一个方向上将会有反射光

$$\int f(x)\delta(x-x_o)d_x = f(x_o)$$

只有当$x$取值为$x_o$时，$\delta$函数才为1，其它全为0

因此我们可以使用脉冲函数来表示:$f_r(p , \omega_o , \omega_i) = \delta(\omega_i - \omega_r) = \delta(\cos\theta_i - \cos\theta_r)\delta(\phi_i - \phi_r)$

该等式的第二部分是将其用球面坐标表示:

$$L_o(\theta_o,\phi_o) = \int_\Omega \delta(cos\theta_i - cos\theta_r) \delta(\phi_o - \phi_r \pm \pi) L_i(\theta_i,\phi_i)|cos\theta_i|d\omega_i = L_i(\theta_r,\phi_r \pm \pi)|cos\theta_i|$$

很明显，多了一个$\cos_i$因子，因此对于完美镜面反射可以构造如下BRDF:

$$f_r(p , \omega_o , \omega_i) = F_r(\omega_o)\frac{\omega_i - R(\omega_o , n))}{|\cos\theta_i|}$$

$R(\omega_o , n)$为$\omega_o$关于表面法线的镜面反射方向

此时$L_o(\theta_o , \phi_o) = F_r(\omega_o)L_i(\theta_r , \phi_r\pm \pi)$

前面说过了$F_r(\omega_o)$表示入射光被反射的量

至此，镜面反射的BRDF计算完毕


讲完镜面反射的BRDF，接下来讲讲镜面折射的BRDF

这里我们使用$\tau = 1 - F_r(\omega_i)$表示入射能量被折射的量

因此，微分通量可以表示如下:

$$d\Phi_o = \tau d\Phi_i$$

$$L_o cos\theta_o dA d\omega_o = \tau(L_i\cos\theta_i dAd\omega_i)$$

表示为球面坐标如下:
$$L_o cos\theta_o dA \sin\theta_o d\theta_o d\phi_o = \tau(L_i\cos\theta_idA\sin\theta_id\theta_id\phi_i)$$

由于$\eta_i \sin\theta_i = \eta_o \sin\theta_o$

因此对其求微分可得:

$$\eta_o cos\theta_o d\theta_o = \eta_i\cos\theta_id\theta_i$$

因此:

$$\frac{cos\theta_od\theta_o}{\cos\theta_id\theta_i} = \frac{\eta_i}{\eta_o}$$

又因为$\frac{\sin\theta_o}{\sin\theta_i} = \frac{\eta_i}{\eta_o}$

因此:

$$\frac{\sin\theta_o\cos\theta_od\theta_o}{\sin\theta_i\cos\theta_id\theta_i} = \frac{\eta_i^2}{\eta_o^2}$$

所以

$$L_o\eta_i^2d\phi_o = \tau L_i\eta_o^2 d\phi_i$$

由于$\phi_i = \phi_o + \pi$，因此$d\phi_i = d\phi_o$

所以:

$$L_o = \tau L_i\frac{\eta_o^2}{\eta_i^2}$$

因此镜面折射的BRDF为:

$$f_t(p , \omega_i , \omega_o) = \frac{\eta_o^2}{\eta_i^2}(1 - F_r(\omega_i))\frac{\delta(\omega_i - T(\omega_o , n))}{|\cos\theta_i|}$$

$T(\omega_o , n)$为$\omega_o$关于表面法线的镜面折射向量