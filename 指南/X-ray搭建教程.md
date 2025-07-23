## **X-ray搭建教程**
##### 需求：服务器系统选择 Debian10或以上
---------------------------------------------------------
#### 更新系统

```bash
apt update -y
apt install -y curl
apt install -y socat
```

#### 安装脚本;
```bash
curl https://get.acme.sh | sh
~/.acme.sh/acme.sh --register-account -m xxxx@163.com
```
#### 放行80端口
```bash
iptables -I INPUT -p tcp --dport 80 -j ACCEPT
```
#### 申请证书
```bash
~/.acme.sh/acme.sh  --issue -d xgoogle.com   --standalone
~/.acme.sh/acme.sh --installcert -d xgoogle.com --key-file /root/private.key --fullchain-file /root/cert.crt
```
#### Xray一键代码
```bash
bash <(curl -Ls https://raw.githubusercontent.com/vaxilu/x-ui/master/install.sh)
```
#### 放行端口
```bash
iptables -I INPUT -p tcp --dport 54321 -j ACCEPT
iptables -I INPUT -p tcp --dport 443 -j ACCEPT
```

-------------------------------------------------------------





