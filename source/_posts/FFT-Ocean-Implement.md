---
title: FFT Ocean Implement
date: 2018-09-16 03:46:55
tags: [Rendering]
categories: [Rendering]
---

![The Diagram of Update Displacement Map,来源:Nvidia DirectX 11 Sample OceanCS][FFT_Diagram]
<!-- more -->

# 理论

## 根据Phillips spectrum生成波谱

$$P_h(\vec{k}) = A\frac{exp(\frac{-1}{kL})^2}{k^4} |\vec{k}\cdot \vec{\omega}|^2\tag{1}$$
$$L = \frac{V^2}{g}$$

- V: 风速
- g: 重力常量
- $\vec{\omega}$: 风向
- A: 数值常量

公式中$|\vec{k}\cdot \vec{\omega}|^2$项用于抵消与风向垂直的波

该模型相对简单,但在高[波数$|k|$](https://zh.wikipedia.org/wiki/%E6%B3%A2%E6%95%B8)的情况下收敛性比较差,一个简单的解决方案是乘上一个因子:
$$exp(-k^2\ell^2)$$
$\ell$为波长,且$\ell \ll L$,用于抑制波长小于$\ell$的波

## 计算频域波形振幅

$$\tilde{h}_0(\vec{k}) = \frac{1}{\sqrt{2}}(\xi_r + i\xi_i)\sqrt{P_h(\vec{k})}\tag{2}$$

- $\xi_r$,$\xi_i$为独立无关的高斯随机数,且分布满足期望为0,标准差为1

## 根据色散关系,计算时间`t`处的频域振幅

$$色散关系:\quad \omega(k) = \sqrt{gk}\tag{3}$$
$$\tilde{h}(\vec{k},t) = \tilde{h}_0(k)exp(i\omega(k)t) + \tilde{h}_0^*(-\vec{k})exp(-i\omega(k)t)\tag{4}$$

- $\tilde{h}_0(-\vec{k})^*$:与$\tilde{h}_0(-\vec{k})$共轭,注意不是$\tilde{h}_0(\vec{k})$

该形式满足:$\tilde{h}^*(\vec{k},t) = \tilde{h}(-\vec{k},t)$

## 使用IFFT变换到时域

$$h(\vec{x},t) = \sum_{\vec{k}} \tilde{h}(\vec{k},t)exp(i\vec{k}\cdot \vec{x}) \tag{5}$$

$$\vec{k} = (k_x,k_z),\quad k_x = \frac{2\pi n}{L_x},\quad k_z = \frac{2\pi m}{L_z}$$

$$\frac{-N}{2} \leq n < \frac{N}{2},\quad \frac{-M}{2} \leq m < \frac{M}{2}$$

FFT处理在离散点$\vec{x} = (\frac{n L_x}{N}, \frac{m L_z}{M})$处生成高度域

因为波浪在越靠近波尖处越密集,因此可以通过以下公式计算水平偏移:
$$D(\vec{x},t) = \sum_{\vec{k}} -i\frac{\vec{k}}{k}\tilde{h}(\vec{k},t)exp(i\vec{k}\cdot \vec{x})\tag{6}$$

令:
$$D(\vec{k},t) = -i\frac{\vec{k}}{k}\tilde{h}(\vec{k},t) = D(x,t) + iD(z,t)\tag{7}$$

$$\Rightarrow D(x,t) = -i k_x \tilde{h}(\vec{k},t)\tag{8}$$
$$\Rightarrow D(z,t) = -k_z \tilde{h}(\vec{k},t)\tag{9}$$
$$\Rightarrow D(\vec{x},t) = \sum_{\vec{k}} D(\vec{k},t)exp(i\vec{k}\cdot \vec{x})\tag{10} = \sum_{\vec{k}} D(x,t)exp(i\vec{k}\cdot \vec{x}) + i\sum_{\vec{k}} D(z,t)exp(i\vec{k}\cdot \vec{x})$$

此时网格点的真正的位置为:$\vec{x} + \lambda D(\vec{x},t)$

可见式(5)与式(10)都是IFFT变换形式

接下来将式(5)进行分解:

$$h(\vec{x},t) = \sum_{\vec{k}} \tilde{h}(\vec{k},t)exp(i\vec{k}\cdot \vec{x})$$
$$\Rightarrow h(x,z,t) = \sum_{n=-\frac{N}{2}}^{\frac{N}{2} - 1} \sum_{m=-\frac{M}{2}}^{\frac{M}{2} - 1} \tilde{h}(n,m,t)exp(i(\frac{2\pi n}{L_x},\frac{2\pi m}{L_z}) \cdot (x,z))$$
$$\Rightarrow h(x,z,t) = \sum_{n=-\frac{N}{2}}^{\frac{N}{2} - 1} \sum_{m=-\frac{M}{2}}^{\frac{M}{2} - 1} \tilde{h}(n,m,t)exp(i\frac{2\pi nx}{L_x})exp(i\frac{2\pi mz}{L_z})$$
$$\Rightarrow h(x,z,t) = \sum_{n=0}^{N-1} \sum_{m=0}^{M -1} \tilde{h}(n-\frac{N}{2},m-\frac{M}{2},t)exp(i\frac{2\pi (n - \frac{N}{2})x}{L_x})exp(i\frac{2\pi (m - \frac{M}{2})z}{L_z})$$
$$\Rightarrow h(x,z,t) = \sum_{n=0}^{N-1} \sum_{m=0}^{M -1} \tilde{h}(n-\frac{N}{2},m-\frac{M}{2},t)exp(i\frac{2\pi nx}{L_x})exp(-i\frac{\pi Nx}{L_x})exp(i\frac{2\pi mz}{L_z})exp(-i\frac{\pi M z}{L_z})$$
$$\Rightarrow h(x,z,t) = exp(-i\frac{\pi Nx}{L_x}) exp(-i\frac{\pi M z}{L_z}) \sum_{n=0}^{N-1} \sum_{m=0}^{M -1} \tilde{h}(n-\frac{N}{2},m-\frac{M}{2},t)exp(i\frac{2\pi nx}{L_x})exp(i\frac{2\pi mz}{L_z})$$

令:
$$h'(x,z,t) = \sum_{n=0}^{N-1} \sum_{m=0}^{M -1} \tilde{h}(n-\frac{N}{2},m-\frac{M}{2},t)exp(i\frac{2\pi nx}{L_x})exp(i\frac{2\pi mz}{L_z})$$

$$\Rightarrow h(x,z,t) = exp(-i\frac{\pi Nx}{L_x}) exp(-i\frac{\pi M z}{L_z}) h'(x,z,t)$$

当$N = L_x, M= L_z$时:
$$\Rightarrow h(x,z,t) = exp(-i\pi x) exp(-i\pi z) h'(x,z,t)$$

$$\because e^{ix} = cos x + i sin x$$

$$\therefore h(x,z,t) = (-1)^{x+z}h'(x,z,t)$$

$h'(x,z,t)$为二维FFT,即逐行做一维IFFT再逐列做一维IFFT,FFT计算可参考[库利-图基快速傅立叶变换算法][1]

## 生成DisplacementMap

在计算完`h'(x,z,t)`后还需要乘上$(-1)^{x+z}$才是$h(x,z,t)$,我们可以将$h(x,z,t)$以及$D(\vec{x},t)$存到贴图中
称之为`DisplacementMap`

## 法线计算

法线通过有限差分即可,$h(\vec{x},t)$存在`DisplacementMap`中

设网格实际大小为$(L_x,L_z)$,`DisplacementMap`分辨率为(N,M),则在(x,z)处:
$$T_x = (\frac{2L_x}{N}, h(x + 1, z, t) - h(x - 1, z, t), 0)$$
$$T_z = (0, h(x, z + 1, t) - h(x, z - 1, t), \frac{2L_z}{M})$$

$$
\begin{align}
Normal  &= T_z \times T_x \notag\\\\
        &=  \begin{bmatrix}
            i & j & k \\\\
            0 & h(x, z + 1, t) - h(x, z - 1, t) & \frac{2L_z}{M} \\\\
            \frac{2L_x}{N} & h(x + 1, z, t) - h(x - 1, z, t) & 0
            \end{bmatrix} \notag\\\\
        &= (\frac{-2L_z(h(x + 1, z, t) - h(x - 1, z, t))}{M}, \frac{4L_x L_z}{NM}, \frac{-2L_x (h(x, z + 1, t) - h(x, z - 1, t))}{N})\notag
\end{align}
$$

# 实现

## Phillips
```cpp
float Phillips(Vector2 K, Vector2 windDir, float windSpeed, float amplitude, float dir_depend)
{
    float L = windSpeed * windSpeed / GRAV_ACCEL;

    float l = L / 1000;

    float Ksqr = K.x * K.x + K.y * K.y;
    float Kcos = K.x * windDir.x + K.y * windDir.y;
    float phillips = amplitude * Mathf.Exp(-1.0f / (Ksqr * L * L)) / (Ksqr * Ksqr * Ksqr) * (Kcos * Kcos);

    // 与风向大于90度的波,减弱
    if (Kcos < 0.0f) phillips *= dir_depend;

    return phillips * Mathf.Exp(-Ksqr * l * l);
}
```

## 计算$\tilde{h}_0(\vec{k})$

```cpp
float Gauss()
{
    float u1 = Random.Range(0.0f, 1.0f);
    float u2 = Random.Range(0.0f, 1.0f);

    if (u1 < 1e-6f) u1 = 1e-6f;

    return Mathf.Sqrt(-2 * Mathf.Log(u1)) * Mathf.Cos(2 * Mathf.PI * u2);
}

void ComputeH0(OceanParameter parameter, ref Vector2[] h0, ref float[] omega)
{
    Vector2 windDir = parameter.wind_dir.normalized;

    Vector2 K = Vector2.zero;
    for(int i = 0; i < parameter.displaceMap_dimension; i++)
    {
        K.y = (-parameter.displaceMap_dimension / 2.0f + i) * (2 * Mathf.PI / parameter.patch_size);

        for(int j = 0; j < parameter.displaceMap_dimension; j++)
        {
            K.x = (-parameter.displaceMap_dimension / 2.0f + j) * (2 * Mathf.PI / parameter.patch_size);

            float phillips = (K.x == 0 && K.y == 0) ? 0 : Mathf.Sqrt(Phillips(K, windDir, parameter.wind_speed, parameter.wave_amplitude * 1e-7f, parameter.wind_dependency));

            int index = i * parameter.displaceMap_dimension + j;

            float Gauss_x = Gauss() , Gauss_y = Gauss();
            h0[index].x = phillips * Gauss_x * HALF_SQRT_2;
            h0[index].y = phillips * Gauss_y * HALF_SQRT_2;

            omega[index] = Mathf.Sqrt(GRAV_ACCEL * Mathf.Sqrt(K.x * K.x + K.y * K.y));
        }
    }
}
```

## 计算$h(\vec{k},t),D(x,t),D(z,t)$

与时间相关,需要每帧计算,这里将其放到`ComputeShader`中去算
```cpp
#pragma kernel UpdateSpecturmCS

#define BLOCK_SIZE 16
#define BLOCK_SIZE 16

StructuredBuffer<float2>    H0;
StructuredBuffer<float>     Omega;
RWStructuredBuffer<float2>  HK;
RWStructuredBuffer<float2>  Dx;
RWStructuredBuffer<float2>  Dy;

uint  Dimension;
float curTime;

[numthreads(BLOCK_SIZE, BLOCK_SIZE, 1)]
void UpdateSpecturmCS(uint3 id : SV_DispatchThreadID)
{
    uint in_Index = id.y * Dimension + id.x;
    // 共轭
    uint in_mIndex = (Dimension - id.y) * Dimension + (Dimension - id.x);
    uint out_index = id.y * Dimension + id.x;

    // H(0) -> H(k)
    float2 H0_k  = H0[in_Index];
    float2 H0_mk = H0[in_mIndex];

    float _sin = sin(Omega[in_Index] * curTime);
    float _cos = cos(Omega[in_Index] * curTime);

    float2 ht;
    ht.x = (H0_k.x + H0_mk.x) * _cos - (H0_k.y + H0_mk.y) * _sin;
    ht.y = (H0_k.x - H0_mk.x) * _sin + (H0_k.y + H0_mk.y) * _cos;

    // Dx,Dy
    float kx = id.x - Dimension * 0.5f;
    float ky = id.y - Dimension * 0.5f;

    float sqr_k = kx * kx + ky * ky;
    float rsqr_k = 0;
    if (sqr_k > 1e-12f) rsqr_k = 1.0f / sqrt(sqr_k);

    kx *= rsqr_k;
    ky *= rsqr_k;

    float2 dt_x = float2(ht.y * kx, -ht.x * kx);
    float2 dt_y = float2(ht.y * ky, -ht.x * ky);

    if(id.x < Dimension && id.y < Dimension)
    {
        HK[out_index] = ht;
        Dx[out_index] = dt_x;
        Dy[out_index] = dt_y;
    }
}
```

## Radix-2 IFFT GPU
```cpp
#pragma kernel Radix2CS
#pragma kernel transpose
#pragma kernel copyBuffer
#pragma kernel RowBitReverse

#define THREAD_NUM 128
#define PI 3.14159274

uint thread_count;
uint istride;
uint bit_count;
uint N;

StructuredBuffer<int>       bit_reverse;
StructuredBuffer<float2>    input;
RWStructuredBuffer<float2>  output;

int bitReserve(uint src, uint bit_num)
{
    int dst = 0;
    for (uint i = 0; i < bit_num; i++)
    {
        dst = (dst << 1) + (src & 1);
        src = src >> 1;
    }
    return dst;
}

[numthreads(THREAD_NUM, 1, 1)]
void Radix2CS(uint3 thread_id : SV_DispatchThreadID)
{
    if (thread_id.x >= thread_count)
        return;

    uint mod  = thread_id.x & (istride - 1);
    uint addr = ((thread_id.x - mod) << 1) + mod;

    float2 t = input[addr];
    float2 u = input[addr + istride];

    uint w = (addr - mod) / (istride << 1);
    w = bitReserve(w, bit_count);

    float buttfly_cos = cos(2 * PI * w / (2 << bit_count));
    float buttfly_sin = sin(2 * PI * w / (2 << bit_count));

    output[addr]           = float2(t.x + u.x * buttfly_cos - u.y * buttfly_sin, t.y + u.x * buttfly_sin + u.y * buttfly_cos);
    output[addr + istride] = float2(t.x - u.x * buttfly_cos + u.y * buttfly_sin, t.y - u.x * buttfly_sin - u.y * buttfly_cos);
}

[numthreads(THREAD_NUM, 1, 1)]
void transpose(uint3 thread_id : SV_DispatchThreadID)
{
    if(thread_id.x >= thread_count)
        return;

    int row = thread_id.x / N;
    int col = thread_id.x & (N - 1);

    output[col * N + row] = input[thread_id.x];

    row = (thread_id.x + istride) / N;
    col = (thread_id.x + istride) & (N - 1);
    output[col * N + row] = input[thread_id.x + istride];
}

[numthreads(THREAD_NUM,1,1)]
void copyBuffer(uint3 thread_id : SV_DispatchThreadID)
{
    if(thread_id.x >= thread_count)
        return;

    output[thread_id.x] = input[thread_id.x];
    output[thread_id.x + istride] = input[thread_id.x + istride];
}

[numthreads(THREAD_NUM,1,1)]
void RowBitReverse(uint3 thread_id : SV_DispatchThreadID)
{
    if (thread_id.x >= thread_count)
        return;

    int row = thread_id.x / N;
    int col = thread_id.x & (N - 1);

    output[bit_reverse[row] * N + col] = input[thread_id.x];

    row = (thread_id.x + istride) / N;
    col = (thread_id.x + istride) & (N - 1);

    output[bit_reverse[row] * N + col] = input[thread_id.x + istride];
}
```

`Radix2CS`用于计算Radix-2 IFFT,`transpose`用于实现行列转置,`RowBitReverse`实现逐行比特反转排列

以下`Radix-2 FFT`计算过程,先逐列IFFT,位反转,逐行IFFT(转置,逐列IFFT,位反转,转置)
```cpp
public void EvaluteFFT(ComputeBuffer srcBuffer, ref ComputeBuffer dstBuffer)
{
    if (mTempBuffer == null || mBitReverseBuffer == null || dstBuffer == null || mRadix2FFT == null) return;

    ComputeBuffer[] swapBuffer = new ComputeBuffer[2];
    swapBuffer[0] = dstBuffer;
    swapBuffer[1] = mTempBuffer;

    int interation = (int)(Mathf.Log(mSize) / Mathf.Log(2));
    int thread_count = mSize * mSize / 2;
    int thread_group = thread_count / OceanConst.RADIX2FFT_THREAD_NUM;
    for (int i = 0; i < interation; i++)
    {
        mRadix2FFT.SetInt("thread_count", thread_count);
        mRadix2FFT.SetInt("istride", thread_count / (1 << i));
        mRadix2FFT.SetInt("bit_count", i);
        mRadix2FFT.SetInt("N", mSize);
        mRadix2FFT.SetBuffer(0, "input", i == 0 ? srcBuffer : swapBuffer[0]);
        mRadix2FFT.SetBuffer(0, "output", swapBuffer[1]);
        mRadix2FFT.Dispatch(0, thread_group, 1, 1);

        SwapBuffer(ref swapBuffer[0], ref swapBuffer[1]);
    }

    // bit reverse
    {
        mRadix2FFT.SetInt("thread_count", thread_count);
        mRadix2FFT.SetInt("istride", thread_count);
        mRadix2FFT.SetInt("N", mSize);
        mRadix2FFT.SetBuffer(3, "bit_reverse", mBitReverseBuffer);
        mRadix2FFT.SetBuffer(3, "input", swapBuffer[0]);
        mRadix2FFT.SetBuffer(3, "output", swapBuffer[1]);
        mRadix2FFT.Dispatch(3, thread_group, 1, 1);

        SwapBuffer(ref swapBuffer[0], ref swapBuffer[1]);
    }

    // transpose
    {
        mRadix2FFT.SetInt("thread_count", thread_count);
        mRadix2FFT.SetInt("N", mSize);
        mRadix2FFT.SetBuffer(1, "input", swapBuffer[0]);
        mRadix2FFT.SetBuffer(1, "output", swapBuffer[1]);
        mRadix2FFT.Dispatch(1, thread_group, 1, 1);

        SwapBuffer(ref swapBuffer[0], ref swapBuffer[1]);
    }

    for (int i = 0; i < interation; i++)
    {
        mRadix2FFT.SetInt("thread_count", thread_count);
        mRadix2FFT.SetInt("istride", thread_count / (1 << i));
        mRadix2FFT.SetInt("bit_count", i);
        mRadix2FFT.SetInt("N", mSize);
        mRadix2FFT.SetBuffer(0, "input", swapBuffer[0]);
        mRadix2FFT.SetBuffer(0, "output", swapBuffer[1]);
        mRadix2FFT.Dispatch(0, thread_group, 1, 1);

        SwapBuffer(ref swapBuffer[0], ref swapBuffer[1]);
    }

    // bit reverse
    {
        mRadix2FFT.SetInt("thread_count", thread_count);
        mRadix2FFT.SetInt("istride", thread_count);
        mRadix2FFT.SetInt("N", mSize);
        mRadix2FFT.SetBuffer(3, "bit_reverse", mBitReverseBuffer);
        mRadix2FFT.SetBuffer(3, "input", swapBuffer[0]);
        mRadix2FFT.SetBuffer(3, "output", swapBuffer[1]);
        mRadix2FFT.Dispatch(3, thread_group, 1, 1);

        SwapBuffer(ref swapBuffer[0], ref swapBuffer[1]);
    }

    // transpose
    {
        mRadix2FFT.SetInt("thread_count", thread_count);
        mRadix2FFT.SetInt("N", mSize);
        mRadix2FFT.SetBuffer(1, "input", swapBuffer[0]);
        mRadix2FFT.SetBuffer(1, "output", swapBuffer[1]);
        mRadix2FFT.Dispatch(1, thread_group, 1, 1);

        SwapBuffer(ref swapBuffer[0], ref swapBuffer[1]);
    }

    if (dstBuffer != swapBuffer[0])
    {
        mRadix2FFT.SetInt("thread_count", thread_count);
        mRadix2FFT.SetInt("istride", thread_count);
        mRadix2FFT.SetBuffer(2, "input", swapBuffer[0]);
        mRadix2FFT.SetBuffer(2, "output", dstBuffer);
        mRadix2FFT.Dispatch(2, thread_group, 1, 1);
    }
}
```

# 效果
![Result][Result]

[代码下载](https://github.com/lonelyWaiting/Ocean)

# 引用

- [Simulating Ocean Water](https://people.cs.clemson.edu/~jtessen/papers_files/coursenotes2004.pdf)
- [Ocean Simulation Part One](https://www.keithlantz.net/2011/10/ocean-simulation-part-one-using-the-discrete-fourier-transform/)
- [Ocean Simulation Part Two](https://www.keithlantz.net/2011/11/ocean-simulation-part-two-using-the-fast-fourier-transform/)
- [色散关系](https://zh.wikipedia.org/wiki/%E8%89%B2%E6%95%A3%E5%85%B3%E7%B3%BB)
- [库利-图基快速傅立叶变换算法][1]
- [Nvidia DirectX 11 Sample](https://developer.nvidia.com/dx11-samples)

[1]: https://zh.wikipedia.org/wiki/%E5%BA%93%E5%88%A9%EF%BC%8D%E5%9B%BE%E5%9F%BA%E5%BF%AB%E9%80%9F%E5%82%85%E9%87%8C%E5%8F%B6%E5%8F%98%E6%8D%A2%E7%AE%97%E6%B3%95

[FFT_Diagram]: https://s2.ax1x.com/2019/04/20/ECD1k6.png
[Result]: https://s2.ax1x.com/2019/04/20/ECDQTx.png
