import type { ReactNode } from "react";
import { ModuleHeader } from "./module-header";

interface WorkflowModuleProps {
  number: string;
  title: string;
  description: string;
  children: ReactNode;
  wide?: boolean;
  variant?: "default" | "result";
}

export function WorkflowModule({
  number,
  title,
  description,
  children,
  wide = false,
  variant = "default"
}: WorkflowModuleProps) {
  const className =
    variant === "result"
      ? "workflow-module workflow-module-result"
      : wide
        ? "workflow-module workflow-module-wide"
        : "workflow-module";

  return (
    <section className={className}>
      <ModuleHeader number={number} title={title} description={description} />
      <div className="module-content">{children}</div>
    </section>
  );
}
