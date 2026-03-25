import { createWidget, widget, text_style } from "@zos/ui";
import { COLORS } from "./colors";
import { CONTENT } from "./layout";

const BLOCK_STYLES = {
  h1: { size: 30, color: COLORS.ACCENT_H1, marginTop: 16, marginBottom: 10 },
  h2: { size: 26, color: COLORS.ACCENT_H2, marginTop: 14, marginBottom: 8 },
  h3: { size: 22, color: COLORS.ACCENT_H3, marginTop: 12, marginBottom: 6 },
  h4: { size: 20, color: COLORS.ACCENT_HEADING, marginTop: 10, marginBottom: 4 },
  h5: { size: 18, color: COLORS.ACCENT_HEADING, marginTop: 8, marginBottom: 4 },
  h6: { size: 18, color: COLORS.ACCENT_HEADING, marginTop: 8, marginBottom: 4 },
  paragraph: { size: 18, color: COLORS.TEXT_PRIMARY, marginTop: 4, marginBottom: 6 },
  ul: { size: 18, color: COLORS.TEXT_PRIMARY, marginTop: 2, marginBottom: 2 },
  ol: { size: 18, color: COLORS.TEXT_PRIMARY, marginTop: 2, marginBottom: 2 },
  code_block: { size: 15, color: COLORS.CODE, marginTop: 8, marginBottom: 8 },
  blockquote: { size: 18, color: COLORS.BLOCKQUOTE_TEXT, marginTop: 6, marginBottom: 6 },
  hr: { size: 0, color: COLORS.BORDER_HR, marginTop: 10, marginBottom: 10 },
  table: { size: 16, color: COLORS.TEXT_PRIMARY, marginTop: 4, marginBottom: 4 },
  checkbox_checked: { size: 18, color: COLORS.CHECKBOX_DONE, marginTop: 2, marginBottom: 2 },
  checkbox_unchecked: { size: 18, color: COLORS.CHECKBOX_TODO, marginTop: 2, marginBottom: 2 },
  bold: { size: 18, color: 0xffcc00, marginTop: 2, marginBottom: 2 },
  italic: { size: 18, color: 0xb0b0b0, marginTop: 2, marginBottom: 2 },
  code_inline: { size: 16, color: COLORS.CODE, marginTop: 2, marginBottom: 2 },
  strikethrough: { size: 18, color: 0x666666, marginTop: 2, marginBottom: 2 },
};

const INDENT_PX = 16;

const PREFIX_MAP = {
  ul: "\u2022 ",
  checkbox_checked: "\u2713 ",
  checkbox_unchecked: "\u25CB ",
};

/**
 * Approximate text height. Zepp OS has no text measurement API,
 * so we estimate based on character width and available space.
 */
function estimateTextHeight(text, fontSize, availableWidth) {
  const avgCharWidth = fontSize * 0.45;
  const charsPerLine = Math.floor(availableWidth / avgCharWidth);
  if (charsPerLine <= 0) return fontSize * 2;

  const lines = text.split("\n");
  let totalLines = 0;
  for (const line of lines) {
    totalLines += line.length === 0 ? 1 : Math.ceil(line.length / charsPerLine);
  }
  totalLines += 1; // safety margin

  const lineHeight = fontSize + 6;
  return Math.max(totalLines * lineHeight, fontSize * 2);
}

/**
 * Render parsed markdown blocks as native Zepp OS widgets
 * inside a scrollable VIEW_CONTAINER.
 */
export function renderMarkdownBlocks(container, blocks, containerWidth, extraTopOffset) {
  let currentY = CONTENT.MARGIN_TOP + (extraTopOffset || 0);

  for (const block of blocks) {
    const style = BLOCK_STYLES[block.type];
    if (!style) continue;

    currentY += style.marginTop;
    const indentPx = (block.indent || 0) * INDENT_PX;
    const textX = CONTENT.MARGIN_X + indentPx;
    const textWidth = containerWidth - indentPx;

    if (block.type === "hr") {
      container.createWidget(widget.FILL_RECT, {
        x: textX + 20, y: currentY,
        w: textWidth - 40, h: 1,
        color: style.color,
      });
      currentY += 1 + style.marginBottom;
      continue;
    }

    // Table card (dark background with key: value lines)
    if (block.type === "table") {
      const h = estimateTextHeight(block.text, style.size, textWidth - 24);
      container.createWidget(widget.FILL_RECT, {
        x: textX, y: currentY - 4,
        w: textWidth, h: h + 16,
        color: COLORS.BG_CARD, radius: 8,
      });
      container.createWidget(widget.TEXT, {
        x: textX + 12, y: currentY + 4,
        w: textWidth - 24, h: h,
        text: block.text, text_size: style.size,
        color: style.color, text_style: text_style.WRAP,
        line_space: 6,
      });
      currentY += h + 16 + style.marginBottom;
      continue;
    }

    // Code inline and code block share a background pattern
    if (block.type === "code_inline" || block.type === "code_block") {
      const pad = block.type === "code_inline" ? 10 : 12;
      const radius = block.type === "code_inline" ? 6 : 8;
      const h = estimateTextHeight(block.text, style.size, textWidth - pad * 2);

      container.createWidget(widget.FILL_RECT, {
        x: textX, y: currentY - 4,
        w: textWidth, h: h + 16,
        color: COLORS.BG_CODE, radius: radius,
      });
      container.createWidget(widget.TEXT, {
        x: textX + pad, y: currentY + 4,
        w: textWidth - pad * 2, h: h,
        text: block.text, text_size: style.size,
        color: style.color, text_style: text_style.WRAP,
        line_space: 4,
      });
      currentY += h + 16 + style.marginBottom;
      continue;
    }

    if (block.type === "blockquote") {
      const h = estimateTextHeight(block.text, style.size, textWidth - 16);
      container.createWidget(widget.FILL_RECT, {
        x: textX, y: currentY,
        w: 3, h: h + 4,
        color: COLORS.BLOCKQUOTE_BORDER,
      });
      container.createWidget(widget.TEXT, {
        x: textX + 12, y: currentY,
        w: textWidth - 16, h: h + 4,
        text: block.text, text_size: style.size,
        color: style.color, text_style: text_style.WRAP,
        line_space: 3,
      });
      currentY += h + 4 + style.marginBottom;
      continue;
    }

    // Default: text block with optional prefix
    const prefix = PREFIX_MAP[block.type] || "";
    const displayText = prefix + block.text;
    const blockHeight = estimateTextHeight(displayText, style.size, textWidth);

    container.createWidget(widget.TEXT, {
      x: textX, y: currentY,
      w: textWidth, h: blockHeight,
      text: displayText, text_size: style.size,
      color: style.color, text_style: text_style.WRAP,
      line_space: 3,
    });

    currentY += blockHeight + style.marginBottom;
  }

  return currentY + CONTENT.MARGIN_BOTTOM + 40;
}
