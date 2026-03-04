import { Component, type ErrorInfo, type ReactNode } from "react";

type Props = {
  children: ReactNode;
  panelName: string;
  onReset?: () => void;
};

type State = {
  hasError: boolean;
  message: string;
};

export class PanelErrorBoundary extends Component<Props, State> {
  state: State = {
    hasError: false,
    message: "",
  };

  static getDerivedStateFromError(error: unknown): State {
    return {
      hasError: true,
      message: error instanceof Error ? error.message : "Error desconocido",
    };
  }

  componentDidCatch(error: unknown, errorInfo: ErrorInfo): void {
    console.error("PANEL_RUNTIME_CRASH", this.props.panelName, error, errorInfo);
  }

  resetBoundary = (): void => {
    this.props.onReset?.();
    this.setState({ hasError: false, message: "" });
  };

  render(): ReactNode {
    if (!this.state.hasError) return this.props.children;

    return (
      <div
        style={{
          border: "1px solid var(--border)",
          borderRadius: 10,
          padding: 12,
          background: "var(--overlay-panel-bg-soft)",
          color: "var(--text)",
          margin: 8,
        }}
      >
        <div style={{ fontWeight: 700, marginBottom: 6 }}>
          Algo salió mal en este panel: {this.props.panelName}
        </div>
        <div style={{ opacity: 0.85, marginBottom: 10 }}>
          Puedes reintentar sin reiniciar toda la aplicación.
        </div>
        {this.state.message ? (
          <div style={{ fontFamily: "monospace", fontSize: 12, marginBottom: 10 }}>
            {this.state.message}
          </div>
        ) : null}
        <button className="primary" onClick={this.resetBoundary}>
          Reintentar panel
        </button>
      </div>
    );
  }
}

