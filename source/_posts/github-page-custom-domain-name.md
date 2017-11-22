---
title: github page custom domain name
date: 2017-11-21 22:52:01
tags:
---

# 域名注册

登录[GoDaddy](https://www.godaddy.com),选择域名进行购买
<!-- more -->

# DNS解析

注册[腾讯云](https://cloud.tencent.com/),腾讯云可以免费解析域名

![tencent cloud control panel](/resources/images/customDomainName/cloud_tencent_control_panel.png)

![云解析](/resources/images/customDomainName/cloud_parse.png)

![添加解析](/resources/images/customDomainName/add_parse_recode.png)

添加完之后将会看到解析状态为`域名DNS未更改`,需要登录`GoDaddy`修改DNS服务器

![修改DNS服务器](/resources/images/customDomainName/godaddy_modify_dns.png)

![自定义域名服务器](/resources/images/customDomainName/custom_domain_name.png)

域名服务器填写`f1g1ns1.dnspod.net`,`f1g1ns2.dnspod.net`

回到腾讯云,解析域名,添加以下两条记录

![添加记录](/resources/images/customDomainName/add_host_parse_recode.png)

| 主机记录 | 记录类型 | 线路类型 | 记录值 | TTL |
| --- | --- | --- | --- | --- |
| @ | CNAME | 默认 | `<your github name>.github.io` | 600 |
| www | CNAME | 默认 | `<your github name>.github.io` | 600 |

# Github Page配置

上传一个`CNAME`文件在Github Page根目录下,其内容为你的域名

`hexo`每次部署都是将本地文件覆盖远程,因此,需要在本地的`source`文件夹中存放`CNAME`文件

``` bash
www.<your_domain_name>.com
```

`CNAME`没有后缀名

# More Infos
- [Github怎么绑定自己的域名](https://www.zhihu.com/question/31377141)
- [Using a custom domain with Github Pages](https://help.github.com/articles/using-a-custom-domain-with-github-pages/)