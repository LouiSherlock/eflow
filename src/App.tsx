import { Link, Outlet, useNavigate, useRouter, useRouterState } from "@tanstack/react-router";
import { useEffect } from "react";
import { HStack } from "@astryxdesign/core/HStack";
import { Icon } from "@astryxdesign/core/Icon";
import { Text } from "@astryxdesign/core/Text";
import { VStack } from "@astryxdesign/core/VStack";
import { isTauri } from "@tauri-apps/api/core";
import { Bookmark, BookOpen, UserRound, type LucideIcon } from "lucide-react";
import { motion } from "motion/react";
import { DesktopTitleBar } from "./components/desktop-titlebar";
import { SecondaryAppBar } from "./components/secondary-app-bar";
import { useSystemInsets } from "./hooks/use-system-insets";
import { useLibrary } from "./services/library";

const PRIMARY_ROUTES = new Set(["/", "/favorites", "/profile"]);
const TAB_ITEMS: ReadonlyArray<{ to: "/" | "/favorites" | "/profile"; label: string; icon: LucideIcon }> = [
  { to: "/", label: "书架", icon: BookOpen },
  { to: "/favorites", label: "收藏", icon: Bookmark },
  { to: "/profile", label: "我的", icon: UserRound },
];

function TabItem({ item }: { item: (typeof TAB_ITEMS)[number] }) {
  return (
    <Link to={item.to} className="app-tab-link">
      {({ isActive }) => (
        <>
          {isActive ? (
            <motion.span
              className="app-tab-indicator"
              layoutId="tab-indicator"
              transition={{ type: "spring", stiffness: 480, damping: 40 }}
              aria-hidden="true"
            />
          ) : null}
          <Icon icon={item.icon} size="md" />
          <Text type="supporting" color="inherit">{item.label}</Text>
        </>
      )}
    </Link>
  );
}
const ROUTE_LABELS: Record<string, string> = {
  "/": "书架",
  "/favorites": "收藏",
  "/profile": "我的",
  "/search": "搜索",
  "/about": "关于",
  "/help": "帮助",
  "/book/$bookId": "书籍详情",
  "/reader/$bookId": "正在阅读",
};

function App() {
  useSystemInsets();
  const hydrateLibrary = useLibrary((state) => state.hydrate);
  useEffect(() => { void hydrateLibrary(); }, [hydrateLibrary]);
  const routeId = useRouterState({
    select: (state) => state.matches[state.matches.length - 1]?.routeId ?? "/",
  });
  const isPrimaryRoute = PRIMARY_ROUTES.has(routeId);
  const isImmersiveRoute = routeId === "/reader/$bookId";
  const isDesktopRuntime =
    isTauri() &&
    typeof navigator !== "undefined" &&
    !/Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
  const router = useRouter();
  const navigate = useNavigate();

  function goBack() {
    if (router.history.canGoBack()) {
      router.history.back();
      return;
    }

    void navigate({ to: "/" });
  }

  return (
    <VStack className="app" gap={0}>
      {isDesktopRuntime ? <DesktopTitleBar /> : null}
   
      {!isPrimaryRoute && !isImmersiveRoute ? (
        <SecondaryAppBar title={ROUTE_LABELS[routeId] ?? "页面"} onBack={goBack} />
      ) : null}

      <VStack
        as="main"
        className={`app-content${isPrimaryRoute ? " has-tabbar primary-content" : ""}${isImmersiveRoute ? " immersive-content" : ""}`}
        gap={4}
      >
        <Outlet />
      </VStack>

      {isPrimaryRoute ? (
        <HStack
          as="nav"
          className="app-tabbar"
          align="center"
          justify="around"
          gap={2}
          aria-label="Main navigation"
        >
          {TAB_ITEMS.map((item) => (
            <TabItem key={item.to} item={item} />
          ))}
        </HStack>
      ) : null}
    </VStack>
  );
}

export default App;
