---
title: FBX Extract Local Rotate
tags: FBX
---
## FBX提取节点的局部旋转

当我们使用如下函数提取旋转时，得到的旋转角度并不是骨骼的局部空间旋转，而是万向空间的旋转<!-- more -->
```C++
FbxNode* pNode = nullptr;
...
FbxVector4 R = pNode->EvaluateLocalTransform().GetR();
```
![3dmax Gimbal Space](/resources/images/local_rotate_extract.png)

若想要提取局部空间的旋转，应该使用如下接口：
```C++
FbxNode* pNode = nullptr;
...
FbxQuaternion Q = pNode->EvaluateLocalTransform().GetQ();
```
提取出来的是局部空间的旋转，使用四元数描述.