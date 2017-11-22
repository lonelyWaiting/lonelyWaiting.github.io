---
title: VPS SSH Git Config
date: 2017-02-16 23:20:48
tags: VPS
---
## 本地配置Git

Git For Windows下载路径[Git for Windows](https://git-scm.com/download/win)
<!-- more -->

### 环境配置

添加系统变量`GIT_HOME`

![GIT HOME System Var](/resources/images/GIT_HOME_SYSTEM_VAR.png)

在系统变量`PATH`中加入如下项
![Git Path Add to System Path](/resources/images/GIT_ADDTO_SYSTEM_PATH.png)

设置完毕之后，重开一个CMD窗口，输入`git`命令，出现下图表示配置正确
![Git Config Verify](/resources/images/Git_Config_Verify.png)

## 服务端配置Git

连接上VPS后，执行以下命令

### 安装Git

```bash
yum update
yum install git
```

### 新建Git用户
```bash
adduser git
```
此命令将会新建用户`git`并创建`/home/git`作为该用户的目录

### 加入sudoer
切换到`root`用户，输入如下命令
```bash
chmod 740 /etc/sudoers
vim /etc/sudoers
```

在列出的文本中找到如下内容
```bash
root	ALL=(ALL) 	ALL
```
在后面新增一行
```bash
git ALL=(ALL) 	ALL
```
再执行如下命令
```bash
chmod 440 /etc/sudoers
```

## 配置SSH登录

打开CMD窗口，进入用户目录下的`.ssh`目录，路径如下：
```bash
C:\Users\yourname\.ssh
```

输入以下命令
```bash
ssh-keygen -t rsa
```

然后一路回车即可, 在`~/.ssh`目录中将会生成`id_rsa`和`id_rsa.pub`两个文件

### 将公钥传送到服务端

切换到git用户
```bash
su git
```

新建`authorized_keys`文件，并将公钥复制进去
```bash
mkdir -p ~/.ssh
touch ~/.ssh/authorized_keys
vi ~/.ssh/authorized_keys
```

然后将`id_rsa.pub`中的数据粘贴到`authorized_keys`中

或者在VPS上以git用户执行
```bash
mkdir -p ~/.ssh
cat ~/.ssh/id_rsa.pub >> ~/.ssh/authorized_keys
```
本地的`~`为你的用户目录：`C:\Users\yourname`

服务端以`git`用户登陆时，`~`表示`\home\git`

因此，若是不切到git用户的话，上述命令改为
```bash
mkdir -p /home/git/.ssh
cat ~/.ssh/id_rsa.pub >> /home/git/.ssh/authorized_keys
```

现在可以在git bash中通过以下命令免密登陆VPS：
```bash
ssh -p port git@ip
```
`port`为你的服务端ssh端口，ip为你服务器地址，如:
```bash
ssh -p 1234 git@34.15.21.145
```

若是依然无法连接，检查服务器的`/etc/ssh/sshd_config`这个文件，以下几行的`#`注释是否移除

```
RSAAuthentication yes
PubkeyAuthentication yes
AuthorizedKeysFile .ssh/authorized_keys
```

若是ssh提示需要登录密码，则切到git用户，输入以下命令:
```bash
chmod o-w ~/
chmod 700 ~/.ssh
chmod 600 ~/.ssh/authorized_keys
```

重启ssh
```bash
/etc/init.d/sshd restart
```