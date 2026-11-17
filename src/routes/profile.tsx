import { createFileRoute } from "@tanstack/react-router";
import { Heading } from "@astryxdesign/core/Heading";
import { Icon } from "@astryxdesign/core/Icon";
import { List, ListItem } from "@astryxdesign/core/List";
import { Text } from "@astryxdesign/core/Text";
import { VStack } from "@astryxdesign/core/VStack";
import { BookMarked, CircleHelp, Settings, UserRound } from "lucide-react";
import { useLibrary } from "../services/library";

export const Route = createFileRoute("/profile")({ component: ProfilePage });

function ProfilePage() {
  const count = useLibrary((state) => state.books.length);
  return <VStack className="library-page" gap={4}>
    <VStack gap={1}><Heading level={2}>我的</Heading><Text type="body" color="secondary">管理阅读偏好与本地书架。</Text></VStack>
    <List density="spacious" hasDividers>
      <ListItem label="本地书架" description={`已导入 ${count} 本书`} startContent={<Icon icon={BookMarked} />} />
      <ListItem label="阅读设置" description="主题、字号和排版" href="/settings" startContent={<Icon icon={Settings} />} />
      <ListItem label="常见问题" description="支持的文件与常见问题" href="/help" startContent={<Icon icon={CircleHelp} />} />
      <ListItem label="关于阅流" description="本机离线阅读器" href="/about" startContent={<Icon icon={UserRound} />} />
    </List>
  </VStack>;
}
