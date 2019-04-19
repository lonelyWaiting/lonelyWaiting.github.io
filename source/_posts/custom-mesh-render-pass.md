---
title: custom mesh render pass
date: 2019-04-13 23:12:32
tags: Unreal
---

# 基础概念

- UPrimitiveComponent: 可用于渲染或者物理交互的基类,游戏线程拥有其所有变量和状态
- FPrimitiveSceneProxy: `UPrimitiveComponent`的渲染线程版本
- FPrimitiveSceneInfo: `UPrimitiveComponent`在渲染器的内部状态,与`FPrimitiveSceneProxy`一一映射
<!-- more -->
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

## 添加Pass枚举

打开文件MeshPassProcessor.h,修改`EMeshPass`结构体,如下:
![Modify MeshPass Enum](/resources/images/MeshDrawingPipeline/AddMeshPassEnum.png)

修改`GetMeshPassName`,如下:
![Modify GetMeshPassName](/resources/images/MeshDrawingPipeline/GetMeshPassName.png)

## 新建文件
新增`MyTestPassRendering.h`,`MyTestPassRendering.cpp`
存至`Engine/Source/Runtime/Renderer/Private`目录

## 添加Shader
新建文件`MyTestVertexShader.usf`,存于`Engine\Shaders\Private`目录
![MyTestVertexShader](/resources/images/MeshDrawingPipeline/MyTestVertexShader.png)
(照抄的PositionOnlyDepthVertexShader.usf)

## 修改`MyTestPassRendering.h`
新增类`FMyTestVS`,如下:
![MyTestVS](/resources/images/MeshDrawingPipeline/MyTestVS.png)

在`MyTestPassRendering.cpp`中通过`IMPLEMENT_MATERIAL_SHADER_TYPE`实现材质shader
![Implement Material Shader](/resources/images/MeshDrawingPipeline/IMPLEMENT_MATERIAL_SAHDER.png)
`IMPLEMENT_SHADERPIPELINE_TYPE_VS`就是构建一个只有`VS`的`FShaderPipelineType`对象

## 添加`MeshPassProcessor`
![FMyTestPassMeshProcessor](/resources/images/MeshDrawingPipeline/MyTestPassMeshProcessor.png)

`AddMeshBatch`是必须要重载的函数

然后需要把这个类型的`MeshPassProcessor`通过以下方式注册到`FPassProcessorManager`中
![Register PassProcessor Create Function](/resources/images/MeshDrawingPipeline/RegisterPassProcessorCreateFunction.png)

这里是把一个函数指针通过`FRegisterPassProcessorCreateFunction`的构造函数,记录到`FPassProcessorManager`中

`SetupMyTestPassState`负责设置渲染状态,这里实现如下:
![SetupMeshPassState](/resources/images/MeshDrawingPipeline/SetupDepthPassState.png)

构造函数实现如下:
![FMyTestPassMeshProcessor Constructor](/resources/images/MeshDrawingPipeline/FMyTestPassMeshProcessorConstructor.png)

构造函数中调用了三个`SetUniformBuffer`
- SetViewUniformBuffer: ViewUniformBuffer中包含各种变换矩阵以及计算用的贴图数据等等
- SetInstancedViewUniformBuffer: 和ViewUniformBuffer差不多,用于`Instance Stereo`
- SetPassUniformBuffer: 包含SceneTexture,如GBuffer,SceneDepthTexture等,便于`MaterialGraph`和`GlobalShader`使用

这里我们自己定义一个`MyTestPassUniformBuffer`:
![Define MyTestPassUniformBuffer](/resources/images/MeshDrawingPipeline/DefineMyTestPassUniformBuffer.png)

初始化`MyTestPassUniformBuffer`:
![InitMyTestPassUniformBuffer](/resources/images/MeshDrawingPipeline/InitMyTestPassUniformBuffer.png)

接下来看`AddMeshBatch`:
![AddMeshBatch](/resources/images/MeshDrawingPipeline/AddMeshBatch.png)
做了个`Pass Filter`
这个实现里也没啥东西...调用了`Process`函数,直接看`Process`
![Process](/resources/images/MeshDrawingPipeline/Process.png)

这个函数就是先做了下`Shader Filter`,然后生成`MeshDrawCommand`

调用`BuildMeshDrawCommands`时,传入了一个参数`PassDrawRenderState`
在构造函数中对`PassDrawRenderState`设置了三个`UniformBuffer`
因此生成的`MeshDrawCommand`都是绑定了这三个`UniformBuffer`的

`GetMyTestPassShaders`实现`Shader Filter`:
![GetMyTestPassShaders](/resources/images/MeshDrawingPipeline/GetMyTestPassShaders.png)

## 收集MeshDrawCommand

之前讲过了`MeshDrawCommand`的三个来源,那么生成了`MeshDrawCommand`之后,还需要确定哪些需要被这个Pass调用

打开`SceneVisibility.cpp`,修改`MarkRelevant()`:
![MarkRelevant](/resources/images/MeshDrawingPipeline/MarkRelevant.png)
这步是收集Cache过的`MeshDrawCommand`

修改`SceneVisibility.cpp`中的`ComputeDynamicMeshRelevance`:
![ComputeDynamicMeshRelevance](/resources/images/MeshDrawingPipeline/ComputeDynamicMeshRelevance.png)
这步是收集Dynamic的`MeshDrawCommand`

## 创建`RenderTarget`
打开`SceneRenderTargets.h`,添加成员`MyTestSceneDepthZ`:
![MyTestSceneDepthZ](/resources/images/MeshDrawingPipeline/MyTestSceneDepthZ.png)

然后创建RT,修改`AllocateDeferredShadingPathRenderTargets`
![Allocate MyTestSceneDepthZ](/resources/images/MeshDrawingPipeline/AllocateMyTestDepth.png)

释放时机,修改`ReleaseSceneColor`,`ReleaseAllTargets`
![Release MyTestSceneDepthZ](/resources/images/MeshDrawingPipeline/ReleaseMyTestDepthZ.png)

以及复制构造函数:
![MyTestSceneDepthZ Copy Constructor](/resources/images/MeshDrawingPipeline/RTCopyConstructor.png)

打开`SceneRenderTargets.h`,在`FSceneRenderTargets`中添加两个函数:
- BeginRenderingMyTestPass
- FinishRenderingMyTestPass
![Function Declaration](/resources/images/MeshDrawingPipeline/BindRTDeclaration.png)
![MyTestPass Bind RT](/resources/images/MeshDrawingPipeline/BindMyTestPass.png)

上面定义了一个临时变量`FRHIRenderPassInfo RPInfo`,这个类型可以设置`ColorRT`,`DepthRT`
然后通过`RHICmdList.BeginRenderPass(RPInfo, TEXT("PassName"))`来绑定RT

## 渲染

在`FDeferredShadingSceneRenderer`中增加函数`RenderMyTestPass`,并在`MyTestPassRendering.cpp`中实现
![RenderMyTestPass](/resources/images/MeshDrawingPipeline/RenderMyTestPass.png)

`SetupMyTestPassView`如下:
![SetupMyTestPassView](/resources/images/MeshDrawingPipeline/SetupMyTestPassView.png)

然后找个地方调用一下,比如放在`RenderPrePass`之后
![Invoke RenderMyTestPass](/resources/images/MeshDrawingPipeline/InvokeRenderMyTestPass.png)

到这一步只能靠renderdoc这种剖析工具查看渲染

# Buffer Visualization

修改`DeferredShadingCommon.ush`的`FGbufferData`
![FGBufferData](/resources/images/MeshDrawingPipeline/FGBufferData.png)

修改`DeferredShadingCommon.ush`的`DecodeGBufferData`
![DecodeGBufferData](/resources/images/MeshDrawingPipeline/DecodeGBufferData.png)

这样就把自定义的值放到`FGBufferData`里了

修改`SceneRenderTargetParameters.h`
![SceneTextureStruct](/resources/images/MeshDrawingPipeline/SceneTextureStruct.png)
该结构定义了一个变量`SceneTexturesStruct`,可见`SceneRenderTargets.cpp`

修改`SceneRenderTargets`的`SetupSceneTetureUniformParameters`
![SetupSceneTextureUniformParameters](/resources/images/MeshDrawingPipeline/SetupSceneTextureUniformParameters.png)

在`RenderMyTestPass`中我们会调用`SetupSceneTetureUniformParameters`
将`MyTestSceneDepthZ`绑定到`SceneTexturesStruct.MyTestTexture`上
因此,在`Shader`代码中可通过`SceneTexturesStruct.MyTestTexture`访问

修改`DeferredShadingCommon.ush`的`GetGBufferDataUint`
![GetGBufferDataUint](/resources/images/MeshDrawingPipeline/GetGBufferDataUint.png)

修改`DeferredShadingCommon.ush`的`GetGBufferData`
![GetGBufferData](/resources/images/MeshDrawingPipeline/GetGBufferData.png)

修改`SceneViewFamilyBlackboard.h`
![Modify FSceneViewFamilyBlackboard](/resources/images/MeshDrawingPipeline/SceneViewFamilyBlackboard_Declaration.png)

修改`SceneViewFamilyBlackboard.cpp`
![Register MyTestSceneDepthZ](/resources/images/MeshDrawingPipeline/Register_MyTestSceneDepthZ.png)

修改`SceneViewFamilyBlackboard.ush`
![Modify SceneViewFamilyBlackboard.ush](/resources/images/MeshDrawingPipeline/SceneViewFamilyBlackboard_Modify.png)

修改`BaseEngine.ini`
![Add Config](/resources/images/MeshDrawingPipeline/BaseEngine_InI.png)

修改`MaterialExpressionSceneTexture.h

![Add MaterialEditor InputSlot](/resources/images/MeshDrawingPipeline/MaterialSlot.png)

接下来新建一个材质,名为`MyTestDepth`,放在`Engine/Content/BufferVisualization`目录下:
![MyTestDepth](/resources/images/MeshDrawingPipeline/MyTestDepth.png)

效果如下:
![BufferVisualization](/resources/images/MeshDrawingPipeline/BufferVisualization.png)

# Reference

- [MeshDrawingPipeline](https://docs.unrealengine.com/en-us/Programming/Rendering/MeshDrawingPipeline)
- [Refactoring the Mesh Drawing Pipeline for Unreal Engine 4.22](https://www.youtube.com/watch?v=qx1c190aGhs&feature=youtu.be)