# Taro多端应用

基于Taro框架开发的多端应用，支持同时编译为iOS、Android、HarmonyOS和Web等多个平台。

## 功能特性

- 登录注册功能（Mock接口实现）
- 用户信息管理
- Token存储与验证
- 优雅的UI设计

## 快速开始

### 安装依赖

```bash
cd taro-react
npm install
```

### 运行项目

#### 微信小程序
```bash
npm run dev:weapp
```

#### H5 (Web)
```bash
npm run dev:h5
```

#### 鸿蒙应用
```bash
npm run dev:harmony-hybrid
```

#### Android
需要先配置Android开发环境，然后运行：
```bash
# 构建Android平台代码
npm run build:rn
# 然后使用Android Studio打开生成的Android项目
```

#### iOS
需要先配置iOS开发环境（Xcode），然后运行：
```bash
# 构建iOS平台代码
npm run build:rn
# 然后使用Xcode打开生成的iOS项目
```

## 项目结构

```
taro-react/
├── src/
│   ├── pages/              # 页面目录
│   │   ├── index/         # 首页
│   │   ├── login/         # 登录页
│   │   └── register/      # 注册页
│   ├── services/          # API服务
│   │   └── api.ts         # Mock接口
│   ├── utils/             # 工具函数
│   │   └── storage.ts     # 存储工具
│   ├── app.config.ts      # 应用配置
│   ├── app.ts             # 应用入口
│   └── app.less           # 全局样式
├── config/                # Taro配置
├── package.json
└── tsconfig.json
```

## Mock接口使用

项目使用Mock接口模拟登录注册功能：

- 测试账号：13800138000
- 测试密码：123456

### 接口列表

1. **登录接口** - `POST /login`
2. **注册接口** - `POST /register`
3. **获取用户信息** - `GET /userInfo`

### 替换为真实接口

在 `src/services/api.ts` 中替换Mock实现为真实API调用即可。

## 技术栈

- Taro 4.2.0
- React 18
- TypeScript
- Less
- 微信小程序平台

## 打包发布

### 微信小程序
```bash
npm run build:weapp
```
然后在微信开发者工具中导入 `dist/weapp` 目录。

### H5
```bash
npm run build:h5
```
生成的文件在 `dist/h5` 目录，可直接部署到Web服务器。

### Android
```bash
npm run build:rn
cd dist/rn && npx react-native run-android
```

### iOS
```bash
npm run build:rn
cd dist/rn && npx react-native run-ios
```

### 鸿蒙
```bash
npm run build:harmony-hybrid
```
生成的鸿蒙项目在 `dist/harmony-hybrid` 目录。

## 注意事项

1. 首次运行需要安装依赖：`npm install`
2. iOS和Android打包需要配置相应的开发环境
3. 鸿蒙平台需要安装HarmonyOS SDK
4. 微信小程序需要在微信公众平台注册并获取AppID
