---
title: use hexo deploy github page
date: 2017-11-16 23:14:24
tags: [hexo,github]
---

## Create Github Page

Create a new repo named `<username>.github.io`,`<username>` is your username on Github

Create a new branch named `source`
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

init hexo in the target `<folder>`,such as `E\blog`

``` bash
$ hexo init <folder>
$ cd <folder>
$ npm install
```

After running the command, a directory named `node_modules` will be added under the blog root folder.

### install git deploy tool 

``` bash
$ npm install hexo-deployer-git --save
```

### config deploy

modify site's setting in `_config.yml`

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

deploy tool will sync `.deploy_git` to master branch while run deploy command

but our blog source file does not version control.

so, we should upload our blog source file to `source` branch.

## Hexo Plugin

### Latex support

``` bash
npm install hexo-math --save
```

More Info: 
- [Create Github Page](https://pages.github.com/)
- [Setup Hexo](https://hexo.io/docs/index.html)
- [Deployment](https://hexo.io/docs/deployment.html)

Plugin:
- [hexo math](https://github.com/hexojs/hexo-math)
- [hexo-deploy-git](https://github.com/hexojs/hexo-deployer-git)