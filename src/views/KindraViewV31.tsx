import { RenderCore, type RenderCoreProps } from "@/views/kindra-v31/RenderCore";

export type KindraViewV31Props = RenderCoreProps;

export function KindraViewV31(props: KindraViewV31Props) {
  return <RenderCore {...props} />;
}
