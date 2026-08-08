export default defineAppConfig({
  pages: [
    'pages/index',
    'pages/mine',
    'pages/settings',
    'pages/login',
    'pages/register',
    'pages/forgot-password',
    'pages/reset-password',
    'pages/profile',
    'pages/calculator',
    'pages/result',
    'pages/agreement',
    'pages/templates',
    'pages/compare',
    'pages/history',
    'pages/report',
    'pages/auto',
    'pages/auto-result',
    'pages/auto-schedule',
    'pages/auto-compare',
    'pages/prepay',
    'pages/prepay-result',
    'pages/prepay-schedule',
    'pages/mortgage',
    'pages/mortgage-result',
    'pages/history-detail',
    'pages/devices'
  ],
  window: {
    backgroundTextStyle: 'light',
    navigationBarBackgroundColor: '#FDF6E3',
    navigationBarTitleText: '网贷利率测',
    navigationBarTextStyle: 'black'
  },
  tabBar: {
    color: '#6B7280',
    selectedColor: '#D4A017',
    backgroundColor: '#FFFFFF',
    borderStyle: 'white',
    custom: true,
    list: [
      {
        pagePath: 'pages/index',
        text: '首页'
      },
      {
        pagePath: 'pages/mortgage',
        text: '房贷计算'
      },
      {
        pagePath: 'pages/auto',
        text: '车贷计算'
      },
      {
        pagePath: 'pages/prepay',
        text: '提前还贷'
      },
      {
        pagePath: 'pages/mine',
        text: '我的'
      },
    ]
  }
})
