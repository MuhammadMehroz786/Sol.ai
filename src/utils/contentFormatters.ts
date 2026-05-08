/**
 * Formats webhook response data into markdown content.
 * Returns webhook output as-is when it's already formatted (text_output / content_markdown).
 */
export const formatResponseData = (response: unknown): string => {
  if (!response) return "";

  const raw = Array.isArray(response) && response.length > 0 ? response[0] : response;
  const data = raw as Record<string, unknown>;

  if (typeof data === "string") return data;
  if (data.text_output) return data.text_output as string;
  if (data.content_markdown) return data.content_markdown as string;

  const body = (data.content || data.body || "") as string;
  const headline = data.headline as string | undefined;
  const tldr = data.tldr as string | undefined;
  const caption = data.caption as string | undefined;

  if (!headline && !body && !tldr && !caption) {
    return JSON.stringify(data, null, 2);
  }

  let out = "";
  if (headline) out += `# ${headline}\n\n`;
  if (tldr)     out += `## In Brief\n\n${tldr}\n\n`;
  if (body)     out += `## Full Story\n\n${body}\n\n`;
  if (caption)  out += `## Caption\n\n${caption}`;

  return out.trim();
};
