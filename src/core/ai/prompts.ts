import type { AiBirthRangeRefinementFactsRequest, AiInputContext } from "@/types/ai";

export function buildExtractionPromptsLocal(
  userText: string,
  focusFullName: string
): { system: string; user: string } {
  const system = [
    "You are a deterministic genealogy extraction engine.",
    "Return ONLY valid JSON. No markdown.",
    "Do not ask questions. Do not request more data.",
    "Do not perform tree matching. Do not invent real IDs.",
    "",
    "Output schema (AiExtractionV4):",
    "- focus: { name, idHint?, confidence }",
    "- persons: [{ tempId, name, surname?, role, confidence, attributes? }]",
    "- familyFacts: [{ type: MARR|DIV, date?, place?, spouses:[tempId,tempId], confidence? }]",
    "- personFacts: [{ type: BIRT|DEAT|RESI|NOTE, person:tempId, date?, place?, value?, confidence? }]",
    "- relations: [{ type: spouse|parent|child|sibling, from:tempId, to:tempId, confidence? }]",
    "- rawText, confidence, assumptions?, userMessage?",
    "",
    `Hard rule: Focus person is \"${focusFullName}\" and is the implicit subject when omitted (e.g., \"se caso\", \"tuvo un hijo\").`,
    "Always include the focus person in `persons` with role `focus` and tempId `ANCHOR`.",
    "Never use literal placeholders like 'string' as values.",
    "",
    "Real example input: juan jesus nunez mendoza se caso con johana torres en 2019.",
    'Real example output: {"focus":{"name":"Juan Jesus Nunez Mendoza","idHint":"ANCHOR","confidence":0.98},"persons":[{"tempId":"ANCHOR","name":"Juan Jesus","surname":"Nunez Mendoza","role":"focus","confidence":0.98},{"tempId":"P2","name":"Johana","surname":"Torres","role":"spouse","confidence":0.93}],"familyFacts":[{"type":"MARR","date":"2019","spouses":["ANCHOR","P2"],"confidence":0.92}],"personFacts":[],"relations":[{"type":"spouse","from":"ANCHOR","to":"P2","confidence":0.93}],"rawText":"juan jesus nunez mendoza se caso con johana torres en 2019","confidence":0.93,"userMessage":"Se detecto un matrimonio del foco con Johana Torres en 2019."}'
  ].join("\n");

  const user = [`FocusFullName: ${focusFullName}`, `InputText: ${userText}`].join("\n");
  return { system, user };
}

export function buildFallbackExtractionPromptsLocal(
  userText: string,
  focusFullName: string
): { system: string; user: string } {
  const system = [
    "You are a permissive deterministic genealogy extractor for noisy text.",
    "Return ONLY valid JSON in AiExtractionV4 shape.",
    "No questions. No matching against database.",
    `Focus is \"${focusFullName}\" and implicit subject must map to tempId ANCHOR.`,
    "If uncertain, return lower confidence and assumptions, but keep best-effort persons/relations/facts."
  ].join("\n");

  const user = [`FocusFullName: ${focusFullName}`, `NoisyInput: ${userText}`].join("\n");
  return { system, user };
}

export function buildExtractionPromptsGlobalFocusOnly(userText: string): { system: string; user: string } {
  const system = [
    "You extract ONLY the main focus person name from genealogy text.",
    "Return ONLY valid JSON. No markdown.",
    "Do not ask questions. Do not match against tree.",
    "Output exactly: {\"focusName\": string|null, \"confidence\": number, \"alternatives\": string[], \"notes\": string[] }",
    "If there is no clear explicit name, focusName must be null."
  ].join("\n");

  return { system, user: `InputText: ${userText}` };
}

// Backward-compatible wrappers during V5 migration.
export function buildExtractionPrompts(userText: string, context: AiInputContext): { system: string; user: string } {
  if (context.kind === "local") {
    return buildExtractionPromptsLocal(userText, context.anchorLabel || context.anchorPersonId);
  }
  return buildExtractionPromptsGlobalFocusOnly(userText);
}

export function buildFallbackExtractionPrompts(userText: string, context: AiInputContext): { system: string; user: string } {
  if (context.kind === "local") {
    return buildFallbackExtractionPromptsLocal(userText, context.anchorLabel || context.anchorPersonId);
  }
  return buildExtractionPromptsGlobalFocusOnly(userText);
}

export function buildGeneGraphPrompts(): { system: string; user: string } {
  return {
    system: "Deprecated in runtime v5.",
    user: "{}"
  };
}

export function buildGlobalAnchorDetectorPrompts(userText: string): { system: string; user: string } {
  return buildExtractionPromptsGlobalFocusOnly(userText);
}

export function buildBirthRangeRefinementPrompt(
  request: AiBirthRangeRefinementFactsRequest
): { system: string; user: string } {
  const system = [
    "You refine genealogical birth year ranges using factual context from a family tree.",
    "Respond in Spanish.",
    "Return ONLY valid JSON. No markdown. No extra text.",
    "Output EXACT shape: {\"minYear\": number, \"maxYear\": number, \"confidence\": number, \"verdict\": string, \"notes\": string[]}",
    "Never return a single-year-only decision; always return a range.",
    "If evidence is weak, still return your best coarse range and explain uncertainty in verdict/notes.",
    "Use only the provided tree facts as anchors. You may use general demographic/historical reasoning.",
    "Do not invent new people, IDs, or fictional events.",
    "Ensure minYear <= maxYear.",
    "confidence must be between 0 and 1.",
    "Keep verdict short (one sentence).",
    "Verdict style must be justificative: explain briefly WHY that range is the most plausible."
  ].join("\n");

  const user = JSON.stringify(
    {
      focusPerson: {
        id: request.focusPersonId,
        label: request.focusPersonLabel,
        sex: request.focusSex,
        currentBirthDateGedcom: request.focusBirthDateCurrent || null
      },
      facts: request.facts,
      task: "Infer a plausible birth range for the focus person using these facts and demographic/historical reasoning."
    },
    null,
    2
  );

  return { system, user };
}

export function buildBirthRangeRefinementCompactPrompt(
  request: AiBirthRangeRefinementFactsRequest
): { system: string; user: string } {
  const system = [
    "You refine genealogical birth ranges from factual tree context.",
    "Respond in Spanish.",
    "Return ONLY valid JSON. No markdown. No prose.",
    "Output EXACT shape: {\"minYear\": number, \"maxYear\": number, \"confidence\": number, \"verdict\": string, \"notes\": string[]}",
    "If token budget is tight, prioritize valid JSON over explanation detail.",
    "verdict must be one justificative line (why this range is plausible).",
    "notes must contain at most 3 short items.",
    "Ensure minYear <= maxYear and confidence between 0 and 1."
  ].join("\n");

  const user = JSON.stringify(
    {
      focusPerson: {
        id: request.focusPersonId,
        label: request.focusPersonLabel,
        sex: request.focusSex,
        currentBirthDateGedcom: request.focusBirthDateCurrent || null
      },
      facts: request.facts,
      task: "Infer best birth range and output strict JSON only."
    },
    null,
    0
  );

  return { system, user };
}
