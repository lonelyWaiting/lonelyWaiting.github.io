---
title: D3D Event Query
date: 2017-12-18 22:36:34
tags: D3D
---

# 使用方法

事件查询步骤:
- pDeviceContext->Begin(pQuery)
- pDeviceContext->End(pQuery)
- pDeviceContext->GetData(pQuery , &queryData , sizeof(UINT64) , 0)
<!-- more -->

# 注意事项

`Begin()`并非是必须的,但是`End()`是必须的

`End()`调用之后，必须在`GetData()`成功之后才能继续调用`End()`,否则将会报D3D Warning

# 常见用法

```cpp
D3D11_QUERY_DESC queryDesc;
... // Fill out queryDesc structure
ID3D11Query * pQuery;
pDevice->CreateQuery(&queryDesc, &pQuery);
pDeviceContext->Begin(pQuery);

... // Issue graphics commands

pDeviceContext->End(pQuery);
UINT64 queryData; // This data type is different depending on the query type

while( S_OK != pDeviceContext->GetData(pQuery, &queryData, sizeof(UINT64), 0) )
{
}
```

# 实际需求

公司残影实现是通过记录下角色的多帧的动画数据(蒙皮矩阵),然后将这些蒙皮数据写到`Palette`上,然后在VS阶段用于蒙皮计算

现在我将所有的蒙皮计算单独挪到一个阶段

因此，残影的渲染需要先走一遍CS蒙皮,将蒙皮结果(Model空间)写到一个Buffer中,再将该Buffer作为渲染的输入流

```cpp
pDeviceContext->CSSetUnorderedAccessView(iStartSlot , 1 , &pGhostBuffer , nullptr);
RunComputeSkin(...);
...
pDeviceContext->IASetVertexBuffer(iStartSlot , 1 , &pGhostBuffer , sizeof(VertexFormat), iGhostOffset);
Render(...);
...
```
由于残影的存在时间很短,存在大量的创建与销毁,因此每个残影一个Buffer的话,将导致资源的重复创建与销毁

所以,我决定使用一个大的Buffer让所有的残影共享这段Buffer,并且可以通过限制残影的个数

```cpp
ID3D11Buffer* pGhostBuffer = nullptr;
// Create Buffer , Bind As VertexBuffer & UAV
// VertexBuffer can't create as StructuredBuffer
// so MiscFlag set to D3D11_RESOURCE_MISC_BUFFER_ALLOW_RAW_VIEWS
// Usage: D3D11_USAGE_DEFAULT,just GPU read and write
// StructuredByteStride = sizeof(VertexFormat) * iVertexNum / 4
// D3D11_RESOURCE_MISC_BUFFER_ALLOW_RAW_VIEWS must DWORD Align
```

既然多个残影共享同一段Buffer,那么就可能出现即写又读的情况，造成GPU与GPU之间的同步等待,这个消耗非常巨大

因此,对于每个残影,都记录一个偏移以及数量,用于表示占用Buffer中的哪一段

```cpp
struct GhostSubBuffer
{
    int offset;
    int num;
    bool GPUUsed;
    ...
};

static vector<GhostSubBuffer> subBuffers;

class VFX_CloneEntity
{
    ...
public:
    std::map<VDynamicMesh,int> buffers; // 角色每个Part引用的GhostSubBuffer索引
}
```

每个残影创建之后,第一次运行CS时,尝试从Buffer中分配一段可用的区间,若分配失败,则该残影不渲,下一帧再继续检测

若分配成功,则走一次蒙皮,将数据缓存在Buffer中，之后渲染不需要再重复计算

```cpp
int bufferOffset = skincache_ghost_get_buffer(cloneEntity , pPartMesh);

<Query Ghost Buffer GPU State>

if(bufferOffset == -1)
{
    bufferOffset = skincache_ghost_map_buffer(cloneEntity , pPartMesh);

    if(bufferOffset == -1) continue;

    skincache_ghost_compute_skinning(..);
}

<Query End>
```
那么必然会涉及到一个何止回收这一段区间的问题,区间被回收之后,就意味着这段区间可被再次使用

因此,我们需要保证回收时这段区间已不再被GPU使用,从而避免同一段Buffer既作为SRV,又作为CS的输出UAV的情况

因为,可以为每一段分配的Buffer区间创建一个`ID3D11Query* query`,在渲染命令之后调用`pDeviceContext->End(pQuery)`

```cpp
struct GhostSubBuffer
{
    ...
    ID3D11Query* query = nullptr;
}
```

然后每帧进行查询,若该残影已被销毁且GPU不再使用这段Buffer,则将其回收

因为我们查询GPU是否在使用这段Buffer并不希望一直等待,因此,可能要在多帧之后`GetData()`才能返回`TRUE`.

但在`GetData()`返回`TRUE`之前不能多次调用`End()`,因此需要记录下相应的状态

```cpp
<Query Ghost Buffer GPU State> = 
    GhostSubBuffer& sb = subBuffers[i];
    if(sb.GPUUsed && pDeviceContext->GetData(sb.query, &queryData, sizeof(UINT64), 0) == S_OK)
    {
        sb.GPUUsed = false;
    }

    RecycleBuffer();

<Query End>
    GhostSubBuffer sb;
    if(!sb.GPUUsed && sb.query)
    {
        sb.GPUUsed = true;
    }
```

`ID3D11Query`可以将其放到一个池中,以便重复利用