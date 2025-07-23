## Mac Intel/M1/M2/M3 系统升级之后有部分应用打开出现类似这样的问题：“xxx.app”已损坏，无法打开。 你应该将它移到废纸篓。

#### 在终端粘贴复制输入命令（注意最后有一个空格，先不要按回车！）：

```toml
sudo xattr -r -d com.apple.quarantine
```
#### 然后打开 “访达”（Finder）进入 “应用程序” 目录，找到该软件图标，将图标拖到刚才的终端窗口里面：

```toml
sudo xattr -r -d com.apple.quarantine /Applications/xxx.app
```
#### 回到终端窗口按回车，输入系统密码回车即可。