---
title: FBX Extract Local Rotate
date: 2017-03-25 15:56:53
tags: FBX
---
## FBX提取节点的局部旋转

实现表情系统时，为了让表情看起来比较生动，通常需要提取出眼睛的运动  

因为游戏中眼睛的位置，朝向等会进行校正，所以从FBX中提取的眼睛骨骼运动只能是记录偏移  

当我们使用如下函数提取旋转时，得到的旋转角度并不是眼睛骨骼的局部空间旋转，而是万向空间的旋转<!-- more -->
```C++
FbxNode* pEyeNode = nullptr;
...
FbxVector4 R = pEyeNode->EvaluateLocalTransform().GetR();
```
![3dmax Gimbal Space](/resources/images/local_rotate_extract.png)

若想要提取局部空间的旋转，应该使用如下接口：
```C++
FbxNode* pEyeNode = nullptr;
...
FbxQuaternion Q = pEyeNode->EvaluateLocalTransform().GetQ();
```
提取出来的是局部空间的旋转，使用四元数描述.