import { createFileRoute } from "@tanstack/react-router";

import { List, ListItem } from "@astryxdesign/core/List";
import { Text } from "@astryxdesign/core/Text";
import { VStack } from "@astryxdesign/core/VStack";

export const Route = createFileRoute("/help")({
  component: HelpPage,
});

/** Descriptions render as nodes so answers wrap instead of truncating. */
function Answer({ children }: { children: string }) {
  return <Text type="supporting" color="secondary">{children}</Text>;
}

function HelpPage() {
  return (
    <VStack paddingBlock={4}>
      <List density="spacious" hasDividers>
        <ListItem
          label="能导入什么格式的？"
          description={<Answer>支持标准 EPUB 和纯文本 TXT。加密或受 DRM 保护的 EPUB 无法打开，PDF、MOBI 等格式暂不支持。</Answer>}
        />
        <ListItem
          label="如何运作？"
          description={<Answer>导入的书籍和封面保存在本机浏览器数据库，书架、收藏和阅读进度记录在本地。打开 EPUB 时会按当前字号重新分页。</Answer>}
        />
        <ListItem
          label="是否会上传我的书籍？"
          description={<Answer>不会。阅读器没有账号和服务器，书籍、封面与阅读记录都只留在本机，断网也能正常阅读。</Answer>}
        />
        <ListItem
          label="如何收藏一本书？"
          description={<Answer>在书架上点开书籍卡片右侧的「⋯」，选择「收藏」，之后可以在「收藏」页集中查看。</Answer>}
        />
        <ListItem
          label="可以调整字号和排版吗？"
          description={<Answer>可以。在「我的 → 阅读设置」里调整字号、两端对齐和深浅色主题，EPUB 会在下一次翻页时应用新设置。</Answer>}
        />
        <ListItem
          label="阅读进度保存在哪里？"
          description={<Answer>进度按百分比和 EPUB 阅读位置保存在本机，翻页后自动记录。换设备或清除应用数据后不会同步。</Answer>}
        />
        <ListItem
          label="删除书籍后还能恢复吗？"
          description={<Answer>不能。删除会移除本机保存的书籍文件和阅读进度，需要重新导入原文件才能再次阅读。</Answer>}
        />
      </List>
    </VStack>
  );
}
