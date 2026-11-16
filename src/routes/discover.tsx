import { createFileRoute, Link } from "@tanstack/react-router";
import { Card } from "@astryxdesign/core/Card";
import { Heading } from "@astryxdesign/core/Heading";
import { HStack } from "@astryxdesign/core/HStack";
import { Icon } from "@astryxdesign/core/Icon";
import { Text } from "@astryxdesign/core/Text";
import { VStack } from "@astryxdesign/core/VStack";
import { BookOpen, Palette, ShieldCheck } from "lucide-react";

export const Route = createFileRoute("/discover")({ component: DiscoverPage });

function DiscoverPage() {
  return <VStack className="library-page" gap={4}>
    <Heading level={2}>发现</Heading>
    <Card padding={4}><VStack gap={3}><Icon className="empty-icon" icon={BookOpen} /><Heading level={3}>把阅读留给自己</Heading><Text type="body" color="secondary">导入的 EPUB 和 TXT 都保存在本机。书架、阅读位置与排版设置可离线使用。</Text></VStack></Card>
    <Card padding={4}><HStack align="start" gap={3}><Icon icon={Palette} /><VStack gap={1}><Heading level={5}>按自己的方式阅读</Heading><Text type="body" color="secondary">在阅读器中调整字号和对齐方式，下一次翻页就会应用新设置。</Text></VStack></HStack></Card>
    <Card padding={4}><HStack align="start" gap={3}><Icon icon={ShieldCheck} /><VStack gap={1}><Heading level={5}>关于 EPUB</Heading><Text type="body" color="secondary">支持标准 EPUB 文件。加密或损坏的文件无法打开，需要使用未受 DRM 保护的副本。</Text><Link to="/help">查看导入帮助</Link></VStack></HStack></Card>
  </VStack>;
}
