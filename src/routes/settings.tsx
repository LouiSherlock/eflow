import { createFileRoute } from "@tanstack/react-router";
import { Button } from "@astryxdesign/core/Button";
import { Heading } from "@astryxdesign/core/Heading";
import { HStack } from "@astryxdesign/core/HStack";
import { Section } from "@astryxdesign/core/Section";
import { Text } from "@astryxdesign/core/Text";
import { VStack } from "@astryxdesign/core/VStack";
import { ThemeSwitcher } from "../components/theme-switcher";
import { useReaderSettings } from "../services/reader-settings";

export const Route = createFileRoute("/settings")({ component: SettingsPage });

function SettingsPage() {
  const settings = useReaderSettings();
  return <VStack gap={4} paddingBlock={4}>
    <Section padding={4} dividers={["bottom"]}><VStack gap={3}><VStack gap={1}><Heading level={5}>显示</Heading><Text type="supporting" color="secondary">选择应用主题。</Text></VStack><ThemeSwitcher /></VStack></Section>
    <Section padding={4} dividers={["bottom"]}><VStack gap={3}><VStack gap={1}><Heading level={5}>阅读排版</Heading><Text type="supporting" color="secondary">这些设置会在下一次翻页时应用到 EPUB。</Text></VStack><HStack align="center" justify="between"><Text type="body">字号</Text><HStack gap={1}><Button label="A−" size="sm" variant="secondary" onClick={() => settings.update({ fontScale: Math.max(0.8, Number((settings.fontScale - 0.1).toFixed(1))) })} /><Button label="A+" size="sm" variant="secondary" onClick={() => settings.update({ fontScale: Math.min(1.5, Number((settings.fontScale + 0.1).toFixed(1))) })} /></HStack></HStack><HStack align="center" justify="between"><Text type="body">两端对齐</Text><Button label={settings.justify ? "已开启" : "已关闭"} size="sm" variant="secondary" onClick={() => settings.update({ justify: !settings.justify })} /></HStack></VStack></Section>
  </VStack>;
}
