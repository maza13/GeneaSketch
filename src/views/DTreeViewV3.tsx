import { RenderCore, type RenderCoreProps } from "@/views/dtree-v3/RenderCore";

export type DTreeViewV3Props = RenderCoreProps;

export function DTreeViewV3(props: DTreeViewV3Props) {
  return <RenderCore {...props} />;
}
