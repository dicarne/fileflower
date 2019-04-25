# FilesFlower
这是一个查看本地文件系统的力导向图。  
本项目采用d3、nodejs、electron实现。

使用方法：  
1. 打开 bin/FilesFlower_miniblink/mini-electron.exe
2. 选择你想查看的目录，例如D:\。
3. 等待片刻，画布中间出现一个圆形。
4. 鼠标悬浮在圆形上可以查看该圆形的路径、大小信息。橙色代表根目录，紫色代表关闭的目录，黄色代表打开的目录，绿色代表文件。圆形的大小代表其相对文件大小。
5. 点击圆形可展开下一集目录。
6. 等待图的更新。

如何更新：
* 若只修改了js与html，则将它们替换resource/app目录下的同名文件。
* 若修改了依赖等，使用```npm run package```打包出完整可执行程序，再将其resources/app下的替换掉，miniblink下的resources/app

### 为什么使用nodejs与electron
因为浏览器不能遍历本地文件系统的所有文件，因此使用nodejs的API，并用electron打包成本地应用程序。

### 为什么使用miniblink
minilink详见：https://weolar.github.io/miniblink/  
因为官方electron的可执行文件实在太大了，高达150mb，而mini-electron却很小，比较适合分享。

#### 参考作品
http://fzaninotto.github.com/CodeFlower  
依照最新版d3进行改写并增加独特功能。

*dicarne, 2019, zhejang gongshang university, cs1601*