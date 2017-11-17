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

### Latex

``` bash
npm install hexo-math --save
```

### Disqus

[Disqus](https://disqus.com/)

#### Disqus Config
click `GET STARTED`, select `I want to install Disqus on my site`

First Step:

![Create a new Site](/images/Disqus_Create_New_Site.png)

Second Step:

![Choose a platform](/images/Disqus_Choose_A_Platform.png)

my Platform is hexo , so i select `install manually with universal code`

Next Disqus will show the Universal Code install instructions page

Third Step:

![Configure Disqus](/images/Disqus_Config.png)

Website URL is `http://<username>.github.io/`

#### Apply Disqus

Open File `layout/_partial/article.ejs` under theme folder

Add this snippet to the end of the file
``` ejs
<% if (!index && post.comments && config.disqus_shortname){ %>
<section id="comments">
  <div id="disqus_thread">
    <noscript>Please enable JavaScript to view the <a href="//disqus.com/?ref_noscript">comments powered by Disqus.</a></noscript>
  </div>
</section>
<% } %>
```

Open File `layout/_partical/after-footer.ejs` under theme folder

Add this snippet to the file
``` ejs
<% if (config.disqus_shortname){ %>
<script>
  var disqus_shortname = '<%= config.disqus_shortname %>';
  <% if (page.permalink){ %>
  var disqus_url = '<%= page.permalink %>';
  <% } %>
  (function(){
    var dsq = document.createElement('script');
    dsq.type = 'text/javascript';
    dsq.async = true;
    dsq.src = '//' + disqus_shortname + '.disqus.com/<% if (page.comments) { %>embed.js<% } else { %>count.js<% } %>';
    (document.getElementsByTagName('head')[0] || document.getElementsByTagName('body')[0]).appendChild(dsq);
  })();
</script>
<% } %>
```
modify site's `_config.yml`
``` yml
disqus_shortname: <shortname> # refer to Website Name in the first step
```

More Info: 
- [Create Github Page](https://pages.github.com/)
- [Setup Hexo](https://hexo.io/docs/index.html)
- [Deployment](https://hexo.io/docs/deployment.html)

Plugin:
- [hexo math](https://github.com/hexojs/hexo-math)
- [hexo-deploy-git](https://github.com/hexojs/hexo-deployer-git)