---
title: custom mesh render pass
date: 2019-04-13 23:12:32
tags: Unreal
---

# 基础概念

- UPrimitiveComponent: 可用于渲染或者物理交互的基类,游戏线程拥有其所有变量和状态
- FPrimitiveSceneProxy: `UPrimitiveComponent`的渲染线程版本
- FPrimitiveSceneInfo: `UPrimitiveComponent`在渲染器的内部状态,与`FPrimitiveSceneProxy`一一映射

# FMeshDrawCommand

保存了在一个特定`Pass`下绘制一个`Mesh`所需要知道的所有信息

![MeshDrawCommand](/resources/images/MeshDrawingPipeline/FMeshDrawCommand.png)

- ShaderBindings: 记录了`Shader`各个阶段绑定的参数集
- VertexStreams:  记录了`VertexBuffer`相关信息
- IndexBuffer:    记录了`IndexBuffer`相关信息
- CachedPipelineId: 用于索引GraphicsPipelineState

# FMeshBatch
![FMeshBatch](/resources/images/MeshDrawingPipeline/FMeshBatch.png)
`FPrimitiveSceneProxy`生成`FMeshBatch`有两个途径
- Cache
- Dynamic

具体由哪个途径生成`FMeshBatch`通过`FPrimitiveSceneProxy::GetViewRelevance`决定

![橙色表示每帧都执行,蓝色表示只执行一次然后被Cache](/resources/images/MeshDrawingPipeline/MeshBatchGeneratePath.png)

`StaticMesh`来说就是`Cache`的方式,在`Proxy`添加到场景时调用`DrawStaticElements`
生成的`FMeshBatch`被保存在`FPrimitiveSceneInfo`的`StaticMeshes`中
每帧进行重用直到`Proxy`从场景中移除
![Cache Path](/resources/images/MeshDrawingPipeline/StaticGenerateMeshBatch.png)

`Dynamic`的方式将会每帧重建`FMeshBatch`,适用于粒子这种
通过调用`GetDynamicElements`来生成
![Dynamic Path](/resources/images/MeshDrawingPipeline/DynamicGenerateMeshBatch.png)

# MeshProcessor

- Select Shader
- Collect Pass Bindings, vertex Factory bindings, material bindings
- Builds One Or More FMeshDrawCommands From a FMeshBatch

![FMeshPassProcessor](/resources/images/MeshDrawingPipeline/FMeshPassProcessor.png)

- AddMeshBatch: 必须重载,根据`FMeshBatch`生成`FMeshDrawCommand`

每个Pass都需要实现一个`MeshPassProcessor`,以`DepthRendering`为例:
![DepthPass AddMeshBatch](/resources/images/MeshDrawingPipeline/DepthPass_AddMeshBatch.png)
通过调用`BuildMeshDrawCommands`生成`MeshDrawCommand`
![DepthPass BuildMeshDrawCommand](/resources/images/MeshDrawingPipeline/DepthPass_Process.png)

# MeshDrawCommand如何产生?

![Cached Mesh Draw Command](/resources/images/MeshDrawingPipeline/CacheMeshDrawCommand.png)

`DynamicMesh`的`MeshDrawCommand`需要每帧产生
目前只有`FLocalVertexFactoy`,即(`UStaticComponent`)可以被`Cached`
因为其它的`VertexFactory`需要依赖`View`来设置`Shader Binding`

- Static Relevance

![Static MeshBatch Cache Flow](/resources/images/MeshDrawingPipeline/Cache_MeshBatch.png)

`FBatchingSPDI::DrawMesh`如下:
![生成MeshBatch,并确定是否支持Cache为MeshDrawCommand](/resources/images/MeshDrawingPipeline/DrawMesh_SupportCacheMeshDrawCommand.png)

可见对于`StaticMesh`而言,`MeshBatch`可以提前Cache
`MeshDrawCommand`需要根据`SupportsCachingMeshDrawCommands`确定是否能`Cache`

`SupportsCachingMeshDrawCommands`如下:
![SupportsCachingMeshDrawCommands](/resources/images/MeshDrawingPipeline/SupportsCachingMeshDrawCommands.png)

目前只有`FLocalVertexFactory`支持Cache `MeshDrawCommand`
如果`VertexFactory`依赖于`View`,由于`View`会变,则`Shader Bindings`需要每帧更新,因此无法Cache `MeshDrawCommand`

Shader Bindings:
- Pass-Constant uniform buffer, 如`ViewUniformBuffer`,`DepthPassUniformBuffer`
- Vertex Factory Bindings
- Materail Bindings
- Primitive Bindings
- Pass specific bindings which change between draws

目前已知`DynamicMesh`需要每帧生成`MeshDrawCommand`
`StaticMesh`根据`StaticMeshBatchRelevance`决定是否需要重新生成

先看下Cache `MeshDrawCommand`的过程:
![Cache Generate MeshDrawCommand](/resources/images/MeshDrawingPipeline/CacheGenerateMeshDrawCommand.png)

`CacheMeshDrawCommands`的实现如下:
![CacheMeshDrawCommands](/resources/images/MeshDrawingPipeline/CacheMeshDrawCommands.png)

会按`PassType`存储在`Scene::CacheDrawLists[PassType]`中

接下来看下如何收集`MeshDrawCommand`
![Gather MeshDrawCommand](/resources/images/MeshDrawingPipeline/GatherMeshDrawCommand.png)

`MeshDrawCommand`的收集就在`ComputeViewVisibility`中完成

- Static MeshDrawCommand的收集如下:
![Gather Static MeshDrawCommand](/resources/images/MeshDrawingPipeline/Gather_StaticMeshDrawCommand.png)

`AddCommandsForMesh`中会根据`bSupportsCachingMeshDrawCommands`来决定是否已经`Cache`好了
![AddCommandsForMesh](/resources/images/MeshDrawingPipeline/AddCommandsForMesh.png)

需要生成`MeshDrawCommand`的`StaticMeshBatch`记录在`DynamicBuildRequests`中

- Dynamic MeshDrawCommand收集

DynamicMesh的`MeshBatch`需要每帧收集:
![Dynamic Path](/resources/images/MeshDrawingPipeline/DynamicGenerateMeshBatch.png)

然后通过`SetupMeshPass`将`StaticMeshBatch`和`DynamicMeshBatch`转换为`MeshDrawCommand`

因此生成`MeshDrawCommand`的大致流程如下:
```cpp
void ComputeViewVisibility(...)
{
    ...

    GatherStaticMeshDrawCommandAndUnCachedMeshBatch(...);

    GatherDynamicMeshBatch(...);

    for(int viewIndex = 0; viewIndex < Views.Num(); ViewIndex++)
    {
        SetupMeshPass(Views[viewIndex], ...)
    }
}
```
最终这些`MeshDrawCommand`被存储于`FViewInfo::ParallelMeshDrawCommandPasses[PassType]`中

# MeshDrawCommand如何使用

最终通过调用以下语句触发`DrawCall`
```
View.ParallelMeshDrawCommandPasses[MeshPassType].DispatchDraw(nullptr, RHICmdList);
```

# custom mesh pass

以复制一个简化版的`DepthPass`为例


# Reference
- [MeshDrawingPipeline](https://docs.unrealengine.com/en-us/Programming/Rendering/MeshDrawingPipeline)
- [Refactoring the Mesh Drawing Pipeline for Unreal Engine 4.22](https://www.youtube.com/watch?v=qx1c190aGhs&feature=youtu.be)