import type {
  AiAppendDiagnosticLogRequest,
  AiCredentialPayload,
  AiCredentialStatus,
  AiReadDiagnosticLogResponse,
  AiInvokeProviderRequest,
  AiInvokeProviderResponse,
  AiListModelsRequest,
  AiListModelsResponse,
  AiValidateRequest,
  AiValidateResponse
} from "@/types/ai";
import { invokeTauri, isDesktopRuntime } from "@/services/tauriBridge";
import {
  webAiAppendDiagnosticLog,
  webAiClearCredentials,
  webAiGetCredentialsStatus,
  webAiInvokeProvider,
  webAiListModels,
  webAiReadDiagnosticLog,
  webAiSaveCredentials,
  webAiValidateCredentials
} from "./aiWebBridge";

export async function aiSaveCredentials(payload: AiCredentialPayload): Promise<AiCredentialStatus> {
  if (!isDesktopRuntime()) return webAiSaveCredentials(payload);
  return invokeTauri<AiCredentialStatus>("ai_save_credentials", { payload });
}

export async function aiGetCredentialsStatus(): Promise<AiCredentialStatus> {
  if (!isDesktopRuntime()) return webAiGetCredentialsStatus();
  return invokeTauri<AiCredentialStatus>("ai_get_credentials_status");
}

export async function aiClearCredentials(): Promise<AiCredentialStatus> {
  if (!isDesktopRuntime()) return webAiClearCredentials();
  return invokeTauri<AiCredentialStatus>("ai_clear_credentials");
}

export async function aiValidateCredentials(request: AiValidateRequest): Promise<AiValidateResponse> {
  if (!isDesktopRuntime()) return webAiValidateCredentials(request);
  return invokeTauri<AiValidateResponse>("ai_validate_credentials", { request });
}

export async function aiListModels(request: AiListModelsRequest): Promise<AiListModelsResponse> {
  if (!isDesktopRuntime()) return webAiListModels(request);
  return invokeTauri<AiListModelsResponse>("ai_list_models", { request });
}

export async function aiAppendDiagnosticLog(request: AiAppendDiagnosticLogRequest): Promise<void> {
  if (!isDesktopRuntime()) return webAiAppendDiagnosticLog(request);
  return invokeTauri<void>("ai_append_diagnostic_log", { request });
}

export async function aiReadDiagnosticLog(): Promise<AiReadDiagnosticLogResponse> {
  if (!isDesktopRuntime()) return webAiReadDiagnosticLog();
  return invokeTauri<AiReadDiagnosticLogResponse>("ai_read_diagnostic_log");
}

export async function aiInvokeProvider(request: AiInvokeProviderRequest): Promise<AiInvokeProviderResponse> {
  if (!isDesktopRuntime()) return webAiInvokeProvider(request);
  return invokeTauri<AiInvokeProviderResponse>("ai_invoke_provider", { request });
}
