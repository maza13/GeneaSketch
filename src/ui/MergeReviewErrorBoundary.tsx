import { Component, type ErrorInfo, type ReactNode } from "react";
import { MERGE_STRINGS_ES } from "@/ui/merge-review/strings.es";

type Props = {
  children: ReactNode;
  onClose: () => void;
  onClearDraft?: () => void;
};

type State = {
  hasError: boolean;
  message: string;
};

export class MergeReviewErrorBoundary extends Component<Props, State> {
  state: State = {
    hasError: false,
    message: ""
  };

  static getDerivedStateFromError(error: unknown): State {
    return {
      hasError: true,
      message: error instanceof Error ? error.message : MERGE_STRINGS_ES.errorUnknown
    };
  }

  componentDidCatch(error: unknown, errorInfo: ErrorInfo): void {
    console.error("MERGE_RUNTIME_CRASH", error, errorInfo);
  }

  private handleClose = (): void => {
    this.props.onClearDraft?.();
    this.props.onClose();
    this.setState({ hasError: false, message: "" });
  };

  render(): ReactNode {
    if (!this.state.hasError) return this.props.children;
    return (
      <div className="modal-overlay" onClick={this.handleClose}>
        <div className="modal-panel" style={{ width: 640 }} onClick={(event) => event.stopPropagation()}>
          <div className="modal-header">
            <h3>{MERGE_STRINGS_ES.errorTitle}</h3>
            <button onClick={this.handleClose}>Cerrar</button>
          </div>
          <div className="merge-inbox-empty" style={{ marginTop: 12 }}>
            {MERGE_STRINGS_ES.errorDetectedSafeClose}
          </div>
          <div className="modal-line warning" style={{ marginTop: 12 }}>
            {this.state.message || MERGE_STRINGS_ES.errorNoDetail}
          </div>
          <div className="builder-actions" style={{ justifyContent: "flex-end", marginTop: 18 }}>
            <button className="primary" onClick={this.handleClose}>{MERGE_STRINGS_ES.closeAndContinue}</button>
          </div>
        </div>
      </div>
    );
  }
}
