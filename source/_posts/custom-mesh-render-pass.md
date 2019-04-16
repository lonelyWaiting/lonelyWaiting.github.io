---
title: custom mesh render pass
date: 2019-04-13 23:12:32
tags: Unreal
---

# 基础概念

- UPrimitiveComponent: 可用于渲染或者物理交互的基类,游戏线程拥有其所有变量和状态

- FPrimitiveSceneProxy: `UPrimitiveComponent`的渲染线程版本

- FPrimitiveSceneInfo: `UPrimitiveComponent`在渲染器的内部状态,与`FPrimitiveSceneProxy`一一映射

# MeshDrawCommand

```cpp
class FMeshDrawCommand
{
public:
    /**
    * Resource bindings
    */
    FMeshDrawShaderBindings ShaderBindings;
    FVertexInputStreamArray VertexStream;
    FIndexBufferRHIParamRef IndexBuffer;

    /**
    * PSO
    */
    FGraphicsMinimalPipelineStateId CachedPipelineId;

    /**
    * Draw command parameters
    */
    uint32 FirstIndex;
    uint32 NumPrimitives;
    uint32 NumInstances;

    ...
}
```
可见`MeshDrawCommand`中记录了渲染`Mesh`所需的所有信息
- ShaderBindings: 记录了`Shader`各个阶段绑定的参数集
- VertexStreams:  记录了`VertexBuffer`相关信息
- IndexBuffer:    记录了`IndexBuffer`相关信息
- CachedPipelineId: 用于索引GraphicsPipelineState

# MeshProcessor

负责根据`FMeshBatch`生成`FMeshDrawCommand`

```cpp
class FMeshPassProcessor
{
public:
    FMeshPassProcessor(const FScene* InScene, 
                       ERHIFeatureLevel::Type InFeatureLeve, 
                       const FSceneView* InViewIfDynamicMeshCommand, 
                       FMeshPassDrawListContext* InDrawListContext);

    virtual void AddMeshBatch(const FMeshBatch& MeshBatch, 
                              uint64 BatchElementMask, 
                              const FPrimitiveSceneProxy* PrimitiveSceneProxy, 
                              int32 StaticMeshId = -1) = 0;
    ...
}
```

主要函数就上面这两个:
- 构造函数: 参数FMeshPassDrawListContext负责存储`MeshDrawCommand`
- AddMeshBatch: 根据`FMeshBatch`生成`MeshDrawCommand`

当新增一个`MeshPass`时,我们需要自己实现一个`MeshPassProcessor`,并重载上述函数

# MeshDrawCommand如何产生

以`DepthPass`为例

## FScene::AddPrimitive
```cpp
void FScene::AddPrimitive(UPrimitiveComponent* Primitve)
{
    ...
    FPrimitiveSceneProxy* PrimitiveSceneProxy = Primitive->CreateSceneProxy();
    Primitive->SceneProxy = PrimitiveSceneProxy;
    if(!PrimitiveSceneProxy)    return;

    FPrimitiveSceneInfo* PrimitiveSceneInfo = new PrimitiveSceneInfo(Primitive, this);
    PrimitiveSceneProxy->PrimitiveSceneInfo = PrimitiveSceneInfo;

    ...

    FScene* Scene = this;
    ENQUEUE_RENDER_COMMAND(AddPrimitiveCommand)
    (
        [Scene, PrimitiveSceneInfo](FRHICommandListImmediate& RHICmdList)
        {
            FScopeCycleCounter Context(PrimitiveSceneInfo->Proxy->GetStateId());
            Scene->AddPrimitiveSceneInfo_RenderThread(RHICmdList, PrimitiveSceneInfo);
        }
    )
}
```

## FScene::AddPrimitiveSceneInfo_RenderThread
```cpp
void FScene::AddPrimitiveSceneInfo_RenderThread(FRHICommandListImmediate& RHICmdList, 
                                                FPrimitiveSceneInfo* PrimitiveSceneInfo)
{
    Primitives.Add(PrimitiveSceneInfo);
    ...

    if(GIsEditor)
    {
        PrimitiveSceneInfo->AddToScene(RHICmdList, true);
    }
    else
    {
        const bool bAddToDrawList = !(CVarDoLazyStaticMeshUpdate.GetValueOnRenderThread());

        if(bAddToDrawList)
        {
            PrimitiveSceneInfo->AddToScene(RHICmdList, true);
        }
        else
        {
            PrimitiveSceneInfo->AddToScene(RHICmdList, true, false);
            PrimitiveSceneInfo->BeginDeferredUpdateStaticMeshes();
        }
    }
    ...
}
```
这步将`PrimitiveSceneInfo`添加至`Scene`内部的`FPrimitiveSceneInfo`列表中
并调用`PrimitiveSceneInfo->AddToScene()`

## FPrimitiveSceneInfo::AddToScene
```cpp
void FPrimitiveSceneInfo::AddToScene(FRHICommandListImmediate& RHICmdList, 
                                bool bUpdateStaticDrawList, 
                                bool bAddToStaticDrawLists)
{
    ...
    if (bUpdateStaticDrawList)
    {
        AddStaticMeshes(RHICmdList, bAddToStaticDrawList);
    }
    ...
}
```

## FPrimitiveSceneInfo::AddStaticMeshes

添加图元的`Static Meshes`到`Scene`中
```cpp
void FPrimitiveSceneInfo::AddStaticMeshes(FRHICommandListImmediate& RHICmdList, bool bAddToStaticDrawLists)
{
    ...
    for (int32 MeshIndex = 0; MeshIndex < StaticMeshes.Num(); MeshIndex++)
    {
        FStaticMeshBatchRelevance& MeshRelevance = StaticMeshRelevances[MeshIndex];
        FStaticMeshBatch& Mesh = StaticMeshes[MeshIndex];

        FSparseArrayAllocationInfo SceneArrayAllocation = Scene->StaticMeshes.AddUninitialized();
        Scene->StaticMeshes[SceneArrayAllocation.Index] = &Mesh;
        Mesh.Id = SceneArrayAllocation.Index;
        MeshRelevance.Id = SceneArrayAllocation.Index;

        if(Mesh.bRequiresPerElementVisibility)
        {
            Mesh.BatchVisibilityId = Scene->StaticMeshBatchVisibility.AddUninitialized().Index;
            Scene->StaticMeshBatchVisibility[Mesh.BatchVisibilityId] = true;
        }
    }

    if (bAddToStaticDrawLists)
    {
        CachedMeshDrawCommands(RHICmdList);
    }
}
```
先将`StaticMeshBatch`添加至`Scene`的`StaticMeshes`和`StaticMeshBatchVisibility`列表中
再调用`CachedMeshDrawCommands`生成`MeshDrawCommand`

## FPrimitiveSceneInfo::CachedMeshDrawCommands

```cpp
void FPrimitiveSceneInfo::CacheMeshDrawCommands(FRHICommandListImmediate& RHICmdList)
{
    ...

    for(int32 MeshIndex = 0; MeshIndex < StaticMeshes.Num(); MeshIndex++)
    {
        FStaticMeshBatchRelevance& MeshRelevance = StaticMeshRelevances[MeshIndex];
        FStaticMeshBatch& Mesh = StaticMeshes[MeshIndex];

        ...

        if (SupportsCachingMeshDrawCommands(Mesh.VertexFactory, Proxy))
        {
            for (int32 PassIndex = 0; PassIndex < EMeshPass::Num; PassIndex++)
            {
                EMeshPass::Type PassType = (EMeshPass::Type)PassIndex;

                if ((FPassProcessorManager::GetPassFlags(ShadingPath, PassType) & EMeshPassFlags::CachedMeshCommands) != EMeshPassFlag::None)
                {
                    FCachedMeshDrawCommandInfo CommandInfo;
                    CommandInfo.MeshPass = PassType;

                    FCachedPassMeshDrawList& SceneDrawList = Scene->CachedDrawLists[PassType];
                    FCachedPassMeshDrawListContext CachedPassMeshDrawListContext(CommandInfo, SceneDrawList, *Scene);

                    PassProcessorCreateFunction CreateFunction = FPassProcessorManager::GetCreateFunction(ShadingPath, PassType);
                    FMeshPassProcessor* PassMeshProcessor = CreateFunction(Scene, nullptr, &CachedPassMeshDrawListContext);

                    if (PassMeshProcessor != nullptr)
                    {
                        check(!Mesh.bRequiresPerElementVisibility);
                        uint64 BatchElementMask = ~0ull;
                        PassMeshProcessor->AddMeshBatch(Mesh, BatchElementMask, Proxy);

                        PassMeshProcessor->~FMeshPassProcessor();
                    }

                    if (CommandInfo.CommandIndex != -1 || CommandInfo.StateBucketId != -1)
                    {
                        MeshRelevance.CommandInfosMask.Set(PassType);

                        StaticMeshCommandInfos.Add(CommandInfo);
                    }
                }
            }
        }
    }
}
```

该函数为遍历每个`StaticMesh`,并为每个`FStaticMeshBatch`遍历所有的`MeshPass`
每个`MeshPass`都会根据当前的`ShadingPath`和`MeshPass`选择相应的`FMeshPassProcessor`
然后调用`FMeshPassProcessor`的`AddMeshBatch`生成`MeshDrawCommand`

`Scene`对于每个`MeshPass`有一个`CachedDrawList`
该函数为每个`MeshPass`产生的`MeshDrawCommand`都将记录到对应的列表中

# 注册FMeshPassProcessor

正如上面所说的,需要根据`ShadingPath`和`MeshPass`来选择对应的`MeshPassProcessor`
因为每个`Mesh Pass`,我们都需要实现一个`MeshPassProcessor`,并注册到`FPassProcessorManager`中

以`DepthRendering`为例:
```cpp
class FDepthPassMeshProcessor : public FMeshPassProcessor
{
public:
    FDepthPassMeshProcessor(const FScene* Scene,
                            const FSceneView* InViewIfDynamicMeshCommand,
                            const FMeshPassProcessorRenderState& InPassDrawRenderState,
                            const bool InbRespectUseAsOccluderFlag,
                            const EDepthDrawingMode InEarlyZPassMode,
                            const bool InbEarlyZPassMovable,
                            FMeshPassDrawListContext* InDrawListContext);

    virtual void AddMeshBatch(const FMeshBatch& MeshBatch,
                              uint64 BatchElementMask,
                              const FPrimitiveSceneProxy* PrimitiveSceneProxy,
                              int StaticMeshId = -1) override final;
    
private:
    template<bool bPositionOnly>
	void Process(const FMeshBatch& MeshBatch,
                 uint64 BatchElementMask,
                 int32 StaticMeshId,
                 const FPrimitiveSceneProxy* RESTRICT PrimitiveSceneProxy,
                 const FMaterialRenderProxy& RESTRICT MaterialRenderProxy,
                 const FMaterial& RESTRICT MaterialResource,
                 ERasterizerFillMode MeshFillMode,
                 ERasterizerCullMode MeshCullMode);

	FMeshPassProcessorRenderState PassDrawRenderState;

	const bool bRespectUseAsOccluderFlag;
	const EDepthDrawingMode EarlyZPassMode;
	const bool bEarlyZPassMovable;
}
```
从`FMeshPassProcessor`继承，并实现`AddMeshBatch`

然后通过以下方式,将其注册至`FPassProcessorManager`中:
```cpp
FMeshPassProcessor* CreateDepthPassProcessor(const FScene* Scene, 
                                             const FSceneView* InViewIfDynamicMeshCommand, 
                                             FMeshPassDrawListContext* InDrawListContext)
{
	FMeshPassProcessorRenderState DepthPassState;
	SetupDepthPassState(DepthPassState);
	return new(FMemStack::Get()) FDepthPassMeshProcessor(Scene, 
                                                         InViewIfDynamicMeshCommand, 
                                                         DepthPassState, 
                                                         true, 
                                                         Scene->EarlyZPassMode, 
                                                         Scene->bEarlyZPassMovable, 
                                                         InDrawListContext);
}

FRegisterPassProcessorCreateFunction RegisterDepthPass(&CreateDepthPassProcessor, 
                                                        EShadingPath::Deferred, 
                                                        EMeshPass::DepthPass, 
                                                        EMeshPassFlags::CachedMeshCommands | EMeshPassFlags::MainView);
```

`EMeshPassFlags::CachedMeshCommands`指定是否允许Cache MeshDrawCommand

# MeshDrawCommand怎么被调用

# custom mesh pass

