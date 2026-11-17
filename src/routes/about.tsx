import { createFileRoute } from "@tanstack/react-router";

import { Heading } from "@astryxdesign/core/Heading";
import { Section } from "@astryxdesign/core/Section";
import { Text } from "@astryxdesign/core/Text";
import { VStack } from "@astryxdesign/core/VStack";

export const Route = createFileRoute("/about")({
  component: AboutPage,
});

/** Copyright year follows the calendar instead of a fixed constant. */
const YEAR = new Date().getFullYear();

function AboutPage() {
  return (
    <VStack gap={4} paddingBlock={4}>
      <Section padding={4} dividers={["bottom"]}>
        <VStack gap={1}>
          <Heading level={3}>纸间</Heading>
          <Text type="supporting" color="secondary">本地离线 EPUB / TXT 阅读器</Text>
          <Text type="supporting" color="secondary">版本 {__APP_VERSION__}</Text>
        </VStack>
      </Section>

      <Section padding={4} dividers={["bottom"]}>
        <VStack gap={2}>
          <Heading level={5}>版权声明</Heading>
          <Text type="body" color="secondary">© {YEAR} 纸间。本应用是供个人使用的本地阅读工具，不提供、也不分发任何书籍内容。</Text>
          <Text type="body" color="secondary">导入书籍的著作权归原作者及出版方所有，请仅使用你合法持有的副本。未经授权复制或传播受版权保护的作品可能违反法律。</Text>
        </VStack>
      </Section>

      <Section padding={4}>
        <VStack gap={2}>
          <Heading level={5}>免责声明</Heading>
          <Text type="body" color="secondary">本应用按「现状」提供，不对书籍内容的完整性、可用性或阅读体验作任何明示或默示的担保。</Text>
          <Text type="body" color="secondary">书籍文件、封面与阅读进度只保存在本机，清除应用数据或删除书籍后无法恢复，请自行备份重要文件。</Text>
          <Text type="body" color="secondary">使用本应用所产生的一切后果由使用者自行承担，作者不对由此造成的任何直接或间接损失负责。</Text>
        </VStack>
      </Section>
    </VStack>
  );
}
