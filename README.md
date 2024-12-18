## 说明
使用了多重随机源和多轮洗牌来确保随机性：

1. **三重随机源**：
   - drand（League of Entropy）提供的随机源
   - CSPRNG（密码学安全随机数生成器）提供的随机源
   - 用户停止抽奖时的时间戳（毫秒级）

2. **第一轮洗牌**（使用 drand 和 CSPRNG）：
   - 进行3轮洗牌循环，每轮包含：
     - 使用 drand 随机源进行 Fisher-Yates 洗牌
     - 使用 CSPRNG 随机源再次洗牌
     - 随机决定是否反转整个数组
     - 随机交换一些位置（交换次数也是随机的）

3. **第二轮洗牌**（使用时间戳）：
   - 使用用户停止时的时间戳作为新的随机源
   - 对第一轮的结果进行 Fisher-Yates 洗牌
   - 再次随机交换一些位置

这种多重随机性设计可以：
- 利用多个独立的随机源
- 通过多轮洗牌增加随机性
- 引入用户行为（停止时间）作为额外的随机因素
- 避免可能的随机性偏差
## 运行
```bash
go run main.go
```
## 截图
准备抽奖
![image](https://github.com/user-attachments/assets/d6d6433d-1ed1-4d92-90dd-92d1aaecce4d)
正在抽奖
![image](https://github.com/user-attachments/assets/b337d3e1-8673-4764-8be5-0c1e817bc022)
开奖
![image](https://github.com/user-attachments/assets/60044a58-02c1-40d0-b376-58ffce45a2c0)


