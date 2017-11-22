---
title: Open With Sublime
data: 2016-03-05
tags: [Windows]
---

# Right-click Menu

`win + r` ， 输入`regedit`,打开注册表编辑器<!-- more -->

找到`HKEY_CLASSES_ROOT\*\shell`

在`shell`下新建一个项，名字取为`Edit With Sublime`

为该项新建字符串值,名为`Icon`,数值数据为`D:\Sublime Text 3\sublime_text.exe,0`

![Right Click Menu Icon](/resources/images/Open_With_Sublime/EditWithSublime.jpg)

# Edit With Sublime

然后在`Edit With Sublime`项上右键新建项，创建一个子项，名为`command`

选中`command`，数值数据中设置为`D:\Sublime Text 3\sublime_text.exe %1`

![Edit With Sublime](/resources/images/Open_With_Sublime/EditWithSublimeCommand.jpg)