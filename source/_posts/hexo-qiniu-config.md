---
title: hexo qiniu config
date: 2017-11-18 18:00:20
tags:
---

简单来说就是七牛可以用来管理图片,加速访问,标准用户有10G的免费存储空间,超出收费

Github毕竟空间有限,而且国内Github访问慢,所以选用了七牛作为图床<!-- more -->

# 配置

## 七牛空间设置

首先注册[七牛](https://www.qiniu.com/),实名后有10G的免费空间,不实名也能用,有1G的免费空间

注册完之后,到这个界面创建存储空间

![Qiniu Create](/resources/images/Qiniu/qiniu_create.png)

填写存储空间信息

![Qiniu bucket Create](/resources/images/Qiniu/qiniu_bucket_create.png)

1. 不同的地区存储空间超出免费范围收费不同,仅此而已,自行抉择
2. 存储空间名字随便填,只是方便自己管理

## 配置qiniu

### hexo-qiniu-sync

安装七牛同步插件,避免手动上传图片至云空间

``` bash
$ npm install hexo-qiniu-sync --save
```

### 配置说明

``` yml
#七牛云存储设置
##offline       是否离线. 离线状态将使用本地地址渲染
##sync          是否同步
##bucket        空间名称.
##access_key    上传密钥AccessKey
##secret_key    上传密钥SecretKey
##secret_file   秘钥文件路径，可以将上述两个属性配置到文件内，防止泄露，json格式。绝对路径相对路径均可
##dirPrefix     上传的资源子目录前缀.如设置，需与urlPrefix同步 
##urlPrefix     外链前缀.
##up_host      上传服务器路径,如选择华北区域的话配置为http://up-z1.qiniu.com
##local_dir     本地目录.
##update_exist  是否更新已经上传过的文件(仅文件大小不同或在上次上传后进行更新的才会重新上传)
##image/js/css  子参数folder为不同静态资源种类的目录名称，一般不需要改动
##image.extend  这是个特殊参数，用于生成缩略图或加水印等操作。具体请参考http://developer.qiniu.com/docs/v6/api/reference/fop/image/ 
##              可使用基本图片处理、高级图片处理、图片水印处理这3个接口。例如 ?imageView2/2/w/500 即生成宽度最多500px的缩略图
qiniu:
  offline: false
  sync: true
  bucket: blog
  # secret_file: sec/qn.json or C:
  access_key: <your access key>
  secret_key: <your secret key>
  dirPrefix: resources
  urlPrefix: http://ozkp9xvc9.bkt.clouddn.com/resources
  up_host: http(s)://upload-z2.qiniup.com
  local_dir: source/resources
  update_exist: true
  image: 
    folder: images
    extend: 
  js:
    folder: js
  css:
    folder: css
```

- bucket: 创建存储空间时填写的名字

- access_key,secret_key: 与七牛云通讯的密钥,参考[access key and secret key](https://portal.qiniu.com/user/key)

![access key and secret key](/resources/images/Qiniu/qiniu_ak_sk.png)

- dirPrefix: 存储空间中的虚拟目录,如上面的配置中,可以认为在存储空间中有一个叫做`resources`的文件夹

- urlPrefix: 外链前缀,图片在七牛云上地址前缀

![Qiniu url Prefix](/resources/images/Qiniu/qiniu_url_prefix.png)

``` bash
urlPrefix = domain_address + '/' + dirPrefix
```

- up_host: 上传服务器路径,参考[Qiniu upload host](https://developer.qiniu.com/kodo/manual/1671/region-endpoint)

![Qiniu Region Endpoint](/resources/images/Qiniu/qiniu_region_endpoint.png)

- local_dir: 本地存放图片的文件夹,如上述配置中为`source\resources`

##  hexo-asset-image

### 安装
``` bash
$ npm install hexo-asset-image --save
```

### hexo-asset-image是什么?

`hexo-asset-image`用于简化图片引用,需要开启`post_asset_folder`

执行`hexo new [layout] <title>`后将在`<title>.md`同级建立一个`<title>`目录

图片放在该目录总,`markdown`中引用方式为`![](demo.png)`,即可引用`<title>`目录下的`demo.png`

### 为什么改?

之所以修改`hexo-asset-image`是因为`hexo-qiniu-sync`要求图片引用方式改为如下

``` html
{% qnimg imageFile attr1:value1 attr2:value2 'attr3:value31 value32 value3n' [extend:?imageView2/2/w/600 | normal:yes] %}
{% qnjs jsFile attr1:value1 attr2:value2 'attr3:value31 value32 value3n' %}
{% qncss cssFile attr1:value1 attr2:value2 'attr3:value31 value32 value3n' %}
```

而标准的`markdown`语法为:

``` markdown
![caption](image path)
```

### 改成什么样？

我希望使用标准的`markdown`语法来写文章,最终html中`img`的`src`路径为七牛云中的图片外链

### 怎么改？

假设,在`source\resources\images\`下存放一张图片`demo.png`

按照之前的配置,该图片的外链地址为`config.qiniu.urlPrefix/images/demo.png`

标准`markdown`引用该图片的写法为`![](/resources/images/demo.png)`

由于`config.qiniu.urlPrefix`最后一个字段为`resources`

因此，可以分割路径,判断路径的第一个字段与`config.qiniu.urlPrefix`最后一个字段是否相同,进行拼接

### 修改结果

`node_modules\hexo-asset-image\index.js`:
``` javascript
'use strict';
var cheerio = require('cheerio');

// http://stackoverflow.com/questions/14480345/how-to-get-the-nth-occurrence-in-a-string
function getPosition(str, m, i) {
  return str.split(m, i).join(m).length;
}

hexo.extend.filter.register('after_post_render', function(data)
{
  var config = hexo.config;
  var link = config.qiniu.urlPrefix; // local actual image folder
  
  var toprocess = ['excerpt', 'more', 'content'];
  for(var i = 0; i < toprocess.length; i++)
  {
    var key = toprocess[i];

    var $ = cheerio.load(data[key], {
      ignoreWhitespace: false,
      xmlMode: false,
      lowerCaseTags: false,
      decodeEntities: false
    });

    $('img').each(function()
    {
      // For windows style path, we replace '\' to '/'.
      var src = $(this).attr('src').replace('\\', '/');
      // if the regular expression is satisfied, it is actual url instead of local path.
      if(!/http[s]*.*|\/\/.*/.test(src))
      {
        // For "about" page, the first part of "src" can't be removed.
        // In addition, to support multi-level local directory.
        var linkArray = link.split('/').filter(function(elem){
          return elem != '';
        });
        var srcArray = src.split('/').filter(function(elem){
          return elem != '';
        });
        if(linkArray[linkArray.length - 1] == srcArray[0])
        {
          srcArray.shift();
          src = srcArray.join('/');
          $(this).attr('src', link + '/' + src);
        }
      }
    });
    data[key] = $.html();
  }
});

```
由于我只是借用了`hexo-asset-image`的路径拼接,所以不需要开启`post-asset-folder`

### 同步图片

1. 本地调用命令`server`

``` bash
hexo server
```

2. 本地调用命令`sync`或`sync2`

``` bash
hexo sync
hexo s
hexo sync2
hexo s2
```

上述四条命令任意一条皆可,更详细的解释参见引用

More Info:
- [hexo-qiniu-sync](https://github.com/gyk001/hexo-qiniu-sync)
- [hexo-asset-image](https://github.com/CodeFalling/hexo-asset-image)
- [Hexo七牛图床使用](http://error408.com/2016/08/02/Hexo%E4%B8%83%E7%89%9B%E5%9B%BE%E5%BA%8A%E4%BD%BF%E7%94%A8/)
- [使用七牛为Hexo存储图片等资源](https://yuchen-lea.github.io/2016-01-21-use-qiniu-store-file-for-hexo/)