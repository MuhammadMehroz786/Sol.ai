/**
 * Shared content formatting utilities.
 * Extracted from TodaysSignals.tsx and ContentGenerator.tsx to eliminate duplication.
 */

interface ContentMetadata {
  persona?: string;
  output_type?: string;
  created_at?: string;
  headline?: string;
  content_markdown?: string;
  tldr?: string;
  caption?: string;
  slug?: string;
  text_output?: string;
}

/**
 * Formats API response data into readable markdown content.
 */
export const formatResponseData = (response: unknown): string => {
  if (!response) return "";

  const data: ContentMetadata = Array.isArray(response) && response.length > 0
    ? response[0]
    : response as ContentMetadata;

  // If we have text_output, format it beautifully
  if (data.text_output) {
    return formatTextOutput(data.text_output, data);
  }

  // Fallback to old format handling with improved formatting
  let formatted = "";

  // Header with signal context
  formatted += `# **Generated Content**\n\n`;
  formatted += `> *Created by ${data.persona || 'AI Assistant'} • ${data.output_type || 'Content'} • ${new Date().toLocaleDateString()}*\n\n`;
  formatted += `---\n\n`;

  // Title/Headline
  if (data.headline) {
    formatted += `## **Headline**\n\n**${data.headline}**\n\n---\n\n`;
  }

  // Main Content
  if (data.content_markdown) {
    formatted += `## **Main Content**\n\n${data.content_markdown}\n\n---\n\n`;
  }

  // TLDR
  if (data.tldr) {
    formatted += `## **TL;DR**\n\n**Key Takeaway:** ${data.tldr}\n\n---\n\n`;
  }

  // Caption
  if (data.caption) {
    formatted += `## **Social Caption**\n\n${data.caption}\n\n---\n\n`;
  }

  // If no main content sections found, show all available fields
  if (!data.headline && !data.content_markdown && !data.tldr && !data.caption && !data.text_output) {
    formatted += `## **Full Response**\n\n`;
    Object.entries(data).forEach(([key, value]) => {
      const formattedKey = key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
      if (typeof value === 'string') {
        formatted += `**${formattedKey}:** ${value}\n\n`;
      } else {
        formatted += `**${formattedKey}:**\n\`\`\`json\n${JSON.stringify(value, null, 2)}\n\`\`\`\n\n`;
      }
    });
  } else if (!data.text_output) {
    // Metadata footer
    formatted += `## **Generation Details**\n\n`;
    if (data.persona) formatted += `**Persona:** ${data.persona}\n\n`;
    if (data.output_type) formatted += `**Output Type:** ${data.output_type}\n\n`;
    if (data.slug) formatted += `**Slug:** ${data.slug}\n\n`;
    if (data.created_at) formatted += `**Created:** ${new Date(data.created_at).toLocaleString()}\n\n`;
  }

  return formatted;
};

/**
 * Formats text output with enhanced markdown structure.
 */
export const formatTextOutput = (textOutput: string, metadata?: ContentMetadata): string => {
  // Enhanced formatting for better readability
  let formatted = textOutput;

  // Add header if not present
  if (!formatted.startsWith('#')) {
    formatted = `# **Generated Content**\n\n${formatted}`;
  }

  // Add metadata footer if available
  if (metadata) {
    formatted += `\n\n---\n\n`;
    formatted += `### **Generation Details**\n\n`;
    if (metadata.persona) formatted += `**Persona:** ${metadata.persona}  \n`;
    if (metadata.output_type) formatted += `**Output Type:** ${metadata.output_type}  \n`;
    if (metadata.created_at) formatted += `**Created:** ${new Date(metadata.created_at).toLocaleString()}  \n`;
    formatted += `**Generated with SOLE AI**`;
  }

  // Enhance formatting with better structure
  formatted = formatted
    // Make headers more prominent
    .replace(/^## /gm, '## **')
    .replace(/^### /gm, '### **')
    // Add spacing around sections
    .replace(/^(#{1,3})/gm, '\n$1')
    // Clean up extra newlines
    .replace(/\n{3,}/g, '\n\n');

  return formatted;
};
