---
title: directx 11 create device and swap chain
date: 2018-04-18 21:27:10
tags: directx11
categories: directx11
---

# Create Device with adapter

[D3D11CreateDeviceAndSwapChain](https://docs.microsoft.com/zh-cn/windows/desktop/api/d3d11/nf-d3d11-d3d11createdeviceandswapchain)
第一个参数如果传NULL,则以默认Adapter创建
如果参数不为NULL,`DriverType`必须为`D3D_DRIVER_TYPE_UNKNOWN`
<!-- more -->

# DXGI_SWAP_CHAIN_DESC SwapEffect

DXGI支持两种模式:
- BitBlt: DXGI_SWAP_EFFECT_DISCARD,DXGI_SWAP_EFFECT_SEQUENTIAL
- Flip: DXGI_SWAP_EFFECT_FLIP_SEQUENTIAL,DXGI_SWAP_EFFECT_FLIP_DISCARD

Flip不支持MultiSampling

DXGI_SWAP_EFFECT_FLIP_SEQUENTIAL:从Win8开始支持
DXGI_SWAP_EFFECT_FLIP_DISCARD:从Win10开始支持

Flip比BitBlt效率更高,但是对于需要GDI与DirectX混合显示的程序来说，BitBlt是唯一的选择

当SwapChain使用DXGI_SWAP_EFFECT_FLIP_SEQUENTIAL创建,一次成功的Present将会把BackBuffer0从管线解绑,因此需要重新绑定RenderTarget

# Reference

[For flip presentation model swap chains that you create with the DXGI_SWAP_EFFECT_FLIP_SEQUENTIAL value set, a successful presentation results in an unbind of back buffer 0 from the graphics pipeline](https://docs.microsoft.com/zh-cn/windows/desktop/api/dxgi1_2/nf-dxgi1_2-idxgiswapchain1-present1)

[DXGI Flip Mode](https://docs.microsoft.com/zh-cn/windows/desktop/direct3ddxgi/dxgi-flip-model)

[If you set the pAdapter parameter to a non-NULL value, you must also set the DriverType parameter to the D3D_DRIVER_TYPE_UNKNOWN value](https://docs.microsoft.com/zh-cn/windows/desktop/api/d3d11/nf-d3d11-d3d11createdeviceandswapchain)