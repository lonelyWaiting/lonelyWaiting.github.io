---
title: python 3 UnicodeDecodeError when pip install package
date: 2018-03-10 14:29:13
tags: python
categories: python
---

# Issue
安装python库时报错，UnicodeDecodeError
<!-- more -->
![pip install package UnicodeDecodeError](/resources/images/python-install-package-unicodeerror/UnicodeDecodeError.png)

# Solution

打开`python36\lib\site-packages\pip\compat\__init__.py`

修改`console_to_str`函数,将编码改为`gbk`

```python
return s.decode('utf-8')
```
改为:
```python
return s.decode('gbk')
```

# Reason

我的路径中含有中文,解码失败后,`python`默认使用`utf-8`,然而windows中文应该使用`gbk`