import { View, Text } from '@tarojs/components';
import { useState } from 'react';
import Taro, { useDidShow } from '@tarojs/taro';
import './index.less';

export default function Agreement() {
  const [visible, setVisible] = useState(false);

  useDidShow(() => {
    setVisible(true);
  });

  const handleBack = () => {
    const pages = Taro.getCurrentPages();
    if (pages.length > 1) {
      Taro.navigateBack();
    } else {
      Taro.switchTab({ url: '/pages/index' });
    }
  };

  return (
    <View className="agreement-container">
      <View className="header">
        <Text className="back-btn" onClick={handleBack}>‹</Text>
        <Text className="title">用户协议</Text>
        <View className="placeholder" />
      </View>
      <View className="content">
        <View className="title-section">
          <Text className="main-title">网贷利率测 · 用户协议</Text>
          <Text className="version-info">版本：V1.0</Text>
          <Text className="update-date">更新日期：2026年7月6日</Text>
        </View>

        <View className="paragraph">
          <Text className="text">欢迎使用“网贷利率测”（以下简称“本工具”）。本工具由[开发者名称]（以下简称“我们”）开发并运营，是一款纯本地计算的网贷实际利率测算工具。</Text>
        </View>

        <View className="paragraph">
          <Text className="text">
            <Text className="bold">请您在使用本工具前，务必仔细阅读并充分理解本协议的全部内容。</Text>
            如您不同意本协议的任何条款，请立即停止使用本工具。您点击“同意”或继续使用本工具，即视为您已阅读、理解并接受本协议的全部内容。
          </Text>
        </View>

        <View className="highlight-box">
          <Text className="highlight-text">
            <Text className="bold">核心提醒</Text>：本工具为纯本地计算工具，所有数据均在您的设备上处理，
            <Text className="bold">不上传任何信息至服务器</Text>。本工具的计算结果仅供参考，
            <Text className="bold">不构成法律意见</Text>，不具有法律约束力，具体以司法机关的认定为准。
          </Text>
        </View>

        <View className="section">
          <Text className="section-title">一、服务内容与性质</Text>
          <View className="paragraph">
            <Text className="text">1.1 本工具通过您自主输入的借款本金、还款金额、期限等信息，采用内部收益率（IRR）算法，为您测算贷款的实际年化利率，并与法定利率上限（LPR×4）进行对比展示。</Text>
          </View>
          <View className="paragraph">
            <Text className="text">
              1.2 <Text className="bold">本工具为纯本地计算工具</Text>：所有输入数据、计算过程和结果仅在您的设备本地处理，我们不会以任何形式收集、存储或传输您的个人信息及计算结果。
            </Text>
          </View>
          <View className="paragraph">
            <Text className="text">
              1.3 本工具提供的利率测算、合规判断等结果，<Text className="bold">仅供您个人参考使用</Text>，不作为法律诉讼、债务协商或其他法律程序的依据。
            </Text>
          </View>
        </View>

        <View className="section">
          <Text className="section-title">二、用户使用规范</Text>
          <View className="paragraph">
            <Text className="text">2.1 您在使用本工具时，应当确保输入数据的真实性、准确性。因您输入错误数据导致的计算偏差，由您自行承担后果。</Text>
          </View>
          <View className="paragraph">
            <Text className="text">2.2 您不得利用本工具从事以下行为：</Text>
          </View>
          <View className="list">
            <Text className="list-item">- 将本工具用于任何非法目的或违反法律法规的行为；</Text>
            <Text className="list-item">- 对本工具进行反向工程、反编译、破解或试图获取源代码；</Text>
            <Text className="list-item">- 使用任何自动化手段（如爬虫）访问或抓取本工具内容；</Text>
            <Text className="list-item">- 恶意干扰、破坏本工具的正常运行。</Text>
          </View>
          <View className="paragraph">
            <Text className="text">2.3 您应独立判断本工具测算结果的价值和适用性，并自行承担使用风险。</Text>
          </View>
        </View>

        <View className="section">
          <Text className="section-title">三、免责声明（重要）</Text>
          <View className="paragraph">
            <Text className="text">
              <Text className="bold">请您特别注意以下免责条款，这些条款可能免除我们的法律责任：</Text>
            </Text>
          </View>
          <View className="paragraph">
            <Text className="text">
              3.1 <Text className="bold">计算仅供参考</Text>：本工具的利率测算基于您输入的数据和IRR算法模型，由于实际借款合同可能存在复杂的费用结构、还款方式、计息规则等，测算结果可能与实际法定利率存在偏差。
              <Text className="bold">本工具的计算结果仅供您参考，不构成法律证据</Text>。
            </Text>
          </View>
          <View className="paragraph">
            <Text className="text">
              3.2 <Text className="bold">不构成法律意见</Text>：本工具展示的合规判断基于国家法律法规的一般性规定。但不同地区的司法机关对利率上限的认定可能存在差异，且个案情况不同，
              <Text className="bold">本工具的合规判断不构成法律意见</Text>。如您涉及法律纠纷，建议咨询专业律师。
            </Text>
          </View>
          <View className="paragraph">
            <Text className="text">
              3.3 <Text className="bold">LPR数据仅供参考</Text>：本工具内置的LPR历史数据来源于公开信息，我们尽力确保数据准确，但不保证与官方发布完全一致。您可手动修改LPR值，以官方最新数据为准。
            </Text>
          </View>
          <View className="paragraph">
            <Text className="text">3.4 <Text className="bold">服务中断免责</Text>：因系统维护、网络故障、黑客攻击、病毒入侵、不可抗力等原因导致本工具服务中断或数据丢失，我们不承担责任。</Text>
          </View>
          <View className="paragraph">
            <Text className="text">3.5 <Text className="bold">第三方链接免责</Text>：本工具可能包含指向第三方网站的链接，我们对第三方网站的内容、隐私政策、服务质量等不承担责任。</Text>
          </View>
          <View className="paragraph">
            <Text className="text">3.6 <Text className="bold">法律条文引用的时效性</Text>：本工具引用的法律条文（如《最高人民法院关于审理民间借贷案件适用法律若干问题的规定》等）可能发生修订或废止，我们不保证引用的法律条文始终为最新版本。</Text>
          </View>
          <View className="paragraph">
            <Text className="text">3.7 <Text className="bold">用户自行承担后果</Text>：您基于本工具的测算结果采取的任何行动（包括但不限于与贷款机构协商、法律诉讼、拒绝还款等），由您自行承担后果，我们不承担任何责任。</Text>
          </View>
        </View>

        <View className="section">
          <Text className="section-title">四、用户义务</Text>
          <View className="paragraph">
            <Text className="text">4.1 您应通过合法渠道获取您的贷款合同、还款记录等信息，并确保输入本工具的数据真实、准确。</Text>
          </View>
          <View className="paragraph">
            <Text className="text">4.2 您应妥善保管您的设备，避免他人未经授权使用本工具。</Text>
          </View>
          <View className="paragraph">
            <Text className="text">4.3 您使用本工具的行为不得违反您所在国家或地区的法律法规。</Text>
          </View>
        </View>

        <View className="section">
          <Text className="section-title">五、知识产权</Text>
          <View className="paragraph">
            <Text className="text">5.1 本工具的所有内容，包括但不限于界面设计、算法模型、代码、文字、图标等，均受《中华人民共和国著作权法》等法律法规保护。</Text>
          </View>
          <View className="paragraph">
            <Text className="text">5.2 未经我们书面同意，您不得复制、修改、传播、出售或以任何方式利用本工具的任何部分。</Text>
          </View>
        </View>

        <View className="section">
          <Text className="section-title">六、服务变更与终止</Text>
          <View className="paragraph">
            <Text className="text">6.1 我们有权根据运营需要，对本工具的功能、界面、算法等进行调整或更新，无需另行通知。</Text>
          </View>
          <View className="paragraph">
            <Text className="text">6.2 我们有权在必要时修改本协议，修改后的协议将在本工具中公布。如您继续使用本工具，视为您接受修改后的协议。</Text>
          </View>
          <View className="paragraph">
            <Text className="text">6.3 我们有权在任何时候终止本工具的全部或部分服务，无需对您或第三方承担任何责任。</Text>
          </View>
        </View>

        <View className="section">
          <Text className="section-title">七、争议解决与法律适用</Text>
          <View className="paragraph">
            <Text className="text">7.1 本协议的订立、履行、解释及争议解决，适用中华人民共和国法律。</Text>
          </View>
          <View className="paragraph">
            <Text className="text">7.2 因本协议引起的或与本协议有关的任何争议，双方应首先友好协商解决；协商不成的，任何一方均有权将争议提交[开发者所在地]有管辖权的人民法院诉讼解决。</Text>
          </View>
        </View>

        <View className="section">
          <Text className="section-title">八、其他条款</Text>
          <View className="paragraph">
            <Text className="text">8.1 本协议所有条款的标题仅为阅读方便，不具有法律效力。</Text>
          </View>
          <View className="paragraph">
            <Text className="text">8.2 本协议任何条款被认定为无效或不可执行，不影响其他条款的效力。</Text>
          </View>
          <View className="paragraph">
            <Text className="text">8.3 本协议未尽事宜，依照相关法律法规处理。</Text>
          </View>
        </View>

        <View className="section">
          <Text className="section-title">九、联系我们</Text>
          <View className="paragraph">
            <Text className="text">如您对本协议有任何疑问或建议，可通过以下方式联系我们：</Text>
          </View>
          <View className="paragraph">
            <Text className="text"><Text className="bold">电子邮箱</Text>：[填写联系邮箱]</Text>
          </View>
          <View className="paragraph">
            <Text className="text"><Text className="bold">联系地址</Text>：[填写联系地址]</Text>
          </View>
        </View>

        <View className="footer">
          <Text className="footer-text">
            <Text className="bold">请您确认：</Text>您已阅读并理解本协议的全部内容，特别是
            <Text className="bold">加粗</Text>的免责条款。如您不同意本协议，请立即停止使用本工具。您点击“同意”或继续使用本工具，即视为您已接受本协议的全部条款。
          </Text>
        </View>
      </View>
    </View>
  );
}
