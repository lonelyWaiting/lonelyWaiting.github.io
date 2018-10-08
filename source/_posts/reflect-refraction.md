---
title: reflect and refraction
date: 2018‎-01-05 ‎23:33:15
tags: [Rendering,Math]
---

# 反射方向

反射定律:$\theta_i = \theta_o$<!-- more -->

![$\theta_i$为入射角,$\theta_o$为出射角](/resources/images/reflect_refraction/reflect.jpg)

# 折射方向

[折射定律](https://zh.wikipedia.org/wiki/%E6%96%AF%E6%B6%85%E5%B0%94%E5%AE%9A%E5%BE%8B):$\quad$ $\eta_i \sin\theta_i = \eta_t sin\theta_t$

![refraction](/resources/images/reflect_refraction/refraction.jpg)

- $\eta_i$: 入射介质折射率
- $\eta_o$: 出射介质折射率
- $\theta_i$: 入射角
- $\theta_o$: 折射角

[折射方向计算](www.lonelywaiting.com/compute_refract_direction/)

折射率与波长相关，因此,在两种不同媒介的交界面入射的自然光将会沿着多个方向散射,即色散

# 菲涅尔方程

当光经过两种不同折射率的界面时,在两者的交界处可能会同时发生光的反射与折射

[菲涅尔方程](https://zh.wikipedia.org/wiki/%E8%8F%B2%E6%B6%85%E8%80%B3%E6%96%B9%E7%A8%8B)描述了不同光波分量被折射和反射的情况

入射光的功率被界面反射的比例，称之为**反射比**$R$;折射的比例称之为**透射比**$T$

反射比和透射比的具体形式与入射光的偏振有关

垂直偏振光反射比:
$$R_\bot = (\frac{\eta_icos\theta_i - \eta_tcos\theta_t}{\eta_icos\theta_i + \eta_t\cos\theta_t})^2$$

平行偏振光反射比:
$$R_\parallel  = (\frac{\eta_t \cos\theta_i - \eta_i\cos\theta_t}{\eta_t\cos\theta_i + \eta_i\cos\theta_t})^2$$

根据能量守恒,透射比都满足:$T = 1 -R$

图形学中通常考虑光是无偏振的，也就是偏振是等量的:$R = \frac{R_{\|}+R_{\bot}}{2}$

反射和折射光的振幅与入射光的振幅比值通常称之为反射率($r$)和透射率($t$)

$$R = r^2 \quad T = (\frac{\eta_t\cos\theta_t}{\eta_1\cos\theta_i})t^2$$

导体不能透射光,但会部分入射光会被吸收转换为热能,常用的导体的菲涅尔方程如下:

$$r_\|^2 = \frac{(\eta^2 + k^2)cos\theta_i^2 - 2\eta\cos\theta_i + 1}{(\eta^2 + k^2)cos\theta_i^2 + 2\eta\cos\theta_i + 1}$$

$$r_\bot^2 = \frac{(\eta^2 + k^2) - 2\eta\cos\theta_i + \cos\theta_i^2}{(\eta^2 + k^2) + 2\eta\cos\theta_i + \cos\theta_i^2}$$

因为导体不能透射光,因此方程中并无透射角与透射面的折射率

### BRDF

接下来讲讲镜面反射和镜面折射的BRDF

由于菲涅尔方程给出了光被反射的量$F_r(\omega_o)$,因此：

$$L_o(\omega_r) = \int f_r(p, \omega_i, \omega_r )L_i(\omega_i)cos(\theta)d\omega_i = F_r(\omega_o)L_i(\omega_i) = F_r(\omega_i)L_i(\omega_i)\tag{1}$$

$\omega_o$为$\omega_i$关于表面法线的反射向量,$\theta_i = \theta_o$,因此,$F_r(\omega_o)=F_r(\omega_i)$

该BRDF可以使用脉冲函数进行构造:

$$f_r(p , \omega_o , \omega_i) = f \times \delta(\omega_i - \omega_r) = f \times \delta(\cos\theta_i - \cos\theta_r)\delta(\phi_i - \phi_r \pm \pi)\tag{2}$$

因此:

$$L_o(\theta_o,\phi_o) = \int_\Omega f \times \delta(cos\theta_i - cos\theta_r) \delta(\phi_o - \phi_r \pm \pi) L_i(\theta_i,\phi_i)|cos\theta_i|d\omega_i = f \times L_i(\theta_r,\phi_r \pm \pi)|cos\theta_i|$$

结合方程(1):

$$L_o(\omega_o) = f \times L_i(\theta_r,\phi_r \pm \pi)|cos\theta_i| = F_r(\omega_i)L_i(\omega_i)$$

$$\Rightarrow f = \frac{F_r(\omega_o)}{|cos\theta_i|}$$

结合方程(2):

$$\Rightarrow f_r(p , \omega_o , \omega_i) = F_r(\omega_o)\frac{\delta(\omega_i - R(\omega_o , n))}{|\cos\theta_i|}$$

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