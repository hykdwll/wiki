# Git 安装

使用 Git 需要安装 Git 客户端。Git 支持 Linux、Unix、Mac和 Windows 等几乎所有平台。

Git 各平台安装包下载地址为：http://git-scm.com/downloads。

## 1\. Linux 平台上安装 git

各 Linux 系统可以使用其安装包管理工具（apt-get、yum 等）进行安装。

由于Git 的工作需要调用 curl，zlib，openssl，expat，libiconv 等库的代码，需要先安装这些依赖工具。

### 1）Centos/RedHat yum 安装 git

使用 yum 在 Centos/RedHat 系统的安装命令为：

$ yum -y install git
# 验证安装是否成功
$ git --version

如果安装过程中，系统缺失依赖包，可以先安装 git 的依赖包：

$ yum -y install curl-devel expat-devel gettext-devel openssl-devel zlib-devel

### 2）Debian/Ubuntu apt-get 安装 git

使用 apt-get 在 Debian/Ubuntu 系统的安装命令为：

$ apt-get -y install git
# 验证安装是否成功
$ git --version

如果安装过程中，系统缺失依赖包，可以先安装 git 的依赖包：

$ apt-get -y install libcurl4-gnutls-dev libexpat1-dev gettext libz-dev libssl-dev

### 3）Centos/RedHat 源码安装 git

我们可以使用源码包安装自己需要的版本，源码包下载地址：https://mirrors.edge.kernel.org/pub/software/scm/git/。

########### 下载源码 ###########
# 安装 wget
$ yum install -y wget
# 下载源码
$ wget -o /tmp/git-2.21.0.tar.gz https://mirrors.edge.kernel.org/pub/software/scm/git/git-2.21.0.tar.gz
########### 解压编译 ###########
# 安装编译依赖
$ yum install -y curl-devel expat-devel gettext-devel openssl-devel zlib-devel gcc automake autoconf libtool make perl-ExtUtils-MakeMaker
# 解压
$ tar -zxf /tmp/git-2.21.0.tar.gz -C /tmp/
$ cd /tmp/git-2.21.0
# 检验相关依赖，设置安装路径
$ ./configure --prefix=/usr/local/git
# 编译安装
$ make && make install
########### 配置环境变量 ###########
# 配置环境变量
$ vi /etc/profile
# GIT\_HOME
GIT\_HOME=/usr/local/git
export PATH=$PATH:$GIT\_HOME/bin
# 加载环境变量生效
$ source /etc/profile

### 4）Debian/Ubuntu 源码安装 git

我们可以使用源码包安装自己需要的`git版本`，源码包下载地址：https://mirrors.edge.kernel.org/pub/software/scm/git/

########### 下载源码 ###########
# 安装 wget
$ apt-get install -y wget
# 下载源码
$ wget -o /tmp/git-2.21.0.tar.gz https://mirrors.edge.kernel.org/pub/software/scm/git/git-2.21.0.tar.gz
########### 解压编译 ###########
# 安装编译依赖
$ apt-get -y install libcurl4-gnutls-dev libexpat1-dev gettext libz-dev libssl-dev build-essential
# 解压
$ tar -zxf /tmp/git-2.21.0.tar.gz -C /tmp/
$ cd /tmp/git-2.21.0
# 检验相关依赖，设置安装路径
$ ./configure --prefix=/usr/local/git
# 编译安装
$ make && make install
########### 配置环境变量 ###########
# 配置环境变量
$ vi /etc/profile
# GIT\_HOME
GIT\_HOME=/usr/local/git
export PATH=$PATH:$GIT\_HOME/bin
# 加载环境变量生效
$ source /etc/profile

## 2\. Windows 平台上安装 git

在 Windows 平台上安装 Git 可以使用 msysGit，msysGit 项目提供了安装包，可以到 GitHub 的页面上下载 exe 安装文件并运行：

安装包下载地址：https://gitforwindows.org/

如果官网下载慢，可以用国内的镜像：https://npm.taobao.org/mirrors/git-for-windows/。

![](https://www.cainiaojc.com/article/image/2022/0123/7686d35e8d6f088e932d3967103b0584.png)

完成安装之后，就可以使用命令行的 git 工具（已经自带了 ssh 客户端）了，另外还有一个图形界面的 Git 项目管理工具。

在开始菜单里找到"Git"->"Git Bash"，会弹出 Git 命令窗口，你可以在该窗口进行 Git 操作。

## 3\. Mac 平台上安装 git

### 1）命令行方式

使用 Homebrew 安装 git 的命令如下：

$ brew install git

### 2）图形化方式

在 Mac 平台上安装 Git 最容易的当属使用图形化的 Git 安装工具，下载地址为：

http://sourceforge.net/projects/git-osx-installer/

安装界面如下所示：

![18333fig0107-tn](https://www.cainiaojc.com/article/image/2022/0123/92f6a22ed62c90199748380d4adb71cd.png)