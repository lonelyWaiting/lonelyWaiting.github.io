---
title: c++模板检测类型是否为Class
date: 2018-03-11 23:02:32
tags: c++
categories: c++
---

利用成员变量指针的实例化来实现<!-- more -->

# 实现

```c++
template<typename T>
struct TIsClass
{
private:
	template<typename U> static uint16 Func( int U::* );
	template<typename U> static uint8  Func( ... );

public:
	enum
	{
		Value = !__is_union( T ) && ( sizeof( Func<T>( 0 ) ) == sizeof( uint16 ) )
	};
};
```

# 原理

`int U::*`为成员变量指针，指向U的int成员变量
若U为`class`或者`struct`，则该函数可被实例化
否则，该函数无法实例化
