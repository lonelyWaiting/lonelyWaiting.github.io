---
title: use hexo deploy github page
date: 2017-11-16 23:14:24
tags: [hexo,github]
---

## Create Github Page

Create a new repo named `<username>.github.io`,`<username>` is your username on Github

<!-- more -->

## Setup Hexo

### install Node.js

[Node.js](https://nodejs.org/en/)

### install Git 

[git](https://git-scm.com/download/win)

### install hexo command line interface

``` bash
$ npm install -g hexo-cli
```

### init hexo

init hexo in the target `<folder>`

``` bash
$ hexo init <folder>
$ cd <folder>
$ npm install
```

### install git deploy tool 

``` bash
$ npm install hexo-deployer-git --save
```

### config deploy

modify setting in `_config.yml`

``` bash
deploy:
	type: git
	repo: git@github.com:<username>/<username>.github.io.git
	branch: master
```

### generate and deploy hexo

``` bash
$ hexo generate -d
``` 

## Manager Hexo

when we deploy hexo, deploy tool will sync `.deploy_git` to master

but our blog source file does not version control.

so we should new a branch to manager source file.

first create new branch, such as named `source`

then clone to local , overwrite the file under local repo with the file under hexo

## Hexo Plugin

### Latex support

``` bash
npm install hexo-math --save
```

[hexo math](https://github.com/hexojs/hexo-math)

More Info: 
[Create Github Page](https://pages.github.com/)
[Setup Hexo](https://hexo.io/docs/index.html)
[Deployment](https://hexo.io/docs/deployment.html)
[hexo-deploy-git config](https://github.com/hexojs/hexo-deployer-git)