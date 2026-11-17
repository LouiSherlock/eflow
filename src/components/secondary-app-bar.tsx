import type { ReactNode } from "react";
import { Heading } from "@astryxdesign/core/Heading";
import { HStack } from "@astryxdesign/core/HStack";
import { Icon } from "@astryxdesign/core/Icon";
import { IconButton } from "@astryxdesign/core/IconButton";
import { ArrowLeft } from "lucide-react";

/** The app's standard secondary title bar: back, title, and optional actions. */
export function SecondaryAppBar({ title, onBack, className, children }: {
  title: ReactNode;
  onBack: () => void;
  className?: string;
  children?: ReactNode;
}) {
  return <HStack
    as="header"
    className={className ? `secondary-app-bar ${className}` : "secondary-app-bar"}
    align="center"
    gap={3}
  >
    <IconButton className="secondary-back-button" label="返回" icon={<Icon icon={ArrowLeft} />} variant="ghost" onClick={onBack} />
    <Heading level={4} className="secondary-app-title" maxLines={1} hasTruncateTooltip={false}>{title}</Heading>
    {children}
  </HStack>;
}
