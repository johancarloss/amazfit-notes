import { createWidget, widget, text_style, align } from "@zos/ui";
import { COLORS } from "./colors";
import { CONTENT } from "./layout";

// Block type → visual style mapping
const BLOCK_STYLES = {
  h1: { size: 30, color: COLORS.ACCENT_H1, marginTop: 16, marginBottom: 10 },
  h2: { size: 26, color: COLORS.ACCENT_H2, marginTop: 14, marginBottom: 8 },
  h3: { size: 22, color: COLORS.ACCENT_H3, marginTop: 12, marginBottom: 6 },
  h4: { size: 20, color: COLORS.ACCENT_HEADING, marginTop: 10, marginBottom: 4 },
  h5: { size: 18, color: COLORS.ACCENT_HEADING, marginTop: 8, marginBottom: 4 },
  h6: { size: 18, color: COLORS.ACCENT_HEADING, marginTop: 8, marginBottom: 4 },
  paragraph: {
    size: 18,
    color: COLORS.TEXT_PRIMARY,
    marginTop: 4,
    marginBottom: 6,
  },
  ul: { size: 18, color: COLORS.TEXT_PRIMARY, marginTop: 2, marginBottom: 2 },
  ol: { size: 18, color: COLORS.TEXT_PRIMARY, marginTop: 2, marginBottom: 2 },
  code_block: { size: 15, color: COLORS.CODE, marginTop: 8, marginBottom: 8 },
  blockquote: {
    size: 18,
    color: COLORS.BLOCKQUOTE_TEXT,
    marginTop: 6,
    marginBottom: 6,
  },
  hr: { size: 0, color: COLORS.BORDER_HR, marginTop: 10, marginBottom: 10 },
  table: { size: 15, color: COLORS.TEXT_PRIMARY, marginTop: 2, marginBottom: 2 },
  checkbox_checked: {
    size: 18,
    color: COLORS.CHECKBOX_DONE,
    marginTop: 2,
    marginBottom: 2,
  },
  checkbox_unchecked: {
    size: 18,
    color: COLORS.CHECKBOX_TODO,
    marginTop: 2,
    marginBottom: 2,
  },
  bold: {
    size: 18,
    color: 0xffcc00, // Bright yellow for bold
    marginTop: 2,
    marginBottom: 2,
  },
  italic: {
    size: 18,
    color: 0xb0b0b0, // Softer gray for italic
    marginTop: 2,
    marginBottom: 2,
  },
  code_inline: {
    size: 16,
    color: COLORS.CODE, // Cyan
    marginTop: 2,
    marginBottom: 2,
  },
  strikethrough: {
    size: 18,
    color: 0x666666, // Dim gray for strikethrough
    marginTop: 2,
    marginBottom: 2,
  },
};

// Indent step in pixels per nesting level
const INDENT_PX = 16;

/**
 * Estimate text height based on content length, font size, and width.
 * Zepp OS has no text measurement API, so we approximate.
 */
function estimateTextHeight(text, fontSize, availableWidth) {
  // Use conservative char width to avoid cutting text
  var avgCharWidth = fontSize * 0.45;
  var charsPerLine = Math.floor(availableWidth / avgCharWidth);
  if (charsPerLine <= 0) return fontSize * 2;

  var lines = text.split("\n");
  var totalLines = 0;
  for (var i = 0; i < lines.length; i++) {
    var line = lines[i];
    if (line.length === 0) {
      totalLines += 1;
    } else {
      totalLines += Math.ceil(line.length / charsPerLine);
    }
  }

  // Add extra line for safety margin
  totalLines += 1;

  var lineHeight = fontSize + 6;
  return Math.max(totalLines * lineHeight, fontSize * 2);
}

/**
 * Render an array of MarkdownBlock objects as Zepp OS widgets
 * inside a VIEW_CONTAINER.
 *
 * @param {object} container - The VIEW_CONTAINER widget
 * @param {Array} blocks - Parsed blocks from API
 * @param {number} containerWidth - Available content width
 * @returns {number} Total content height rendered
 */
export function renderMarkdownBlocks(container, blocks, containerWidth) {
  var currentY = CONTENT.MARGIN_TOP;

  for (var i = 0; i < blocks.length; i++) {
    var block = blocks[i];
    var style = BLOCK_STYLES[block.type];
    if (!style) continue;

    currentY += style.marginTop;
    var indentPx = (block.indent || 0) * INDENT_PX;
    var textX = CONTENT.MARGIN_X + indentPx;
    var textWidth = containerWidth - indentPx;

    // --- Horizontal Rule ---
    if (block.type === "hr") {
      container.createWidget(widget.FILL_RECT, {
        x: textX + 20,
        y: currentY,
        w: textWidth - 40,
        h: 1,
        color: style.color,
      });
      currentY += 1 + style.marginBottom;
      continue;
    }

    // --- Code Inline (small background + text) ---
    if (block.type === "code_inline") {
      var ciHeight = estimateTextHeight(block.text, style.size, textWidth - 20);
      container.createWidget(widget.FILL_RECT, {
        x: textX,
        y: currentY - 2,
        w: textWidth,
        h: ciHeight + 8,
        color: COLORS.BG_CODE,
        radius: 6,
      });
      container.createWidget(widget.TEXT, {
        x: textX + 10,
        y: currentY + 2,
        w: textWidth - 20,
        h: ciHeight,
        text: block.text,
        text_size: style.size,
        color: style.color,
        text_style: text_style.WRAP,
        line_space: 3,
      });
      currentY += ciHeight + 8 + style.marginBottom;
      continue;
    }

    // --- Code Block (background + text) ---
    if (block.type === "code_block") {
      var codeHeight = estimateTextHeight(
        block.text,
        style.size,
        textWidth - 24
      );
      container.createWidget(widget.FILL_RECT, {
        x: textX,
        y: currentY - 4,
        w: textWidth,
        h: codeHeight + 16,
        color: COLORS.BG_CODE,
        radius: 8,
      });
      container.createWidget(widget.TEXT, {
        x: textX + 12,
        y: currentY + 4,
        w: textWidth - 24,
        h: codeHeight,
        text: block.text,
        text_size: style.size,
        color: style.color,
        text_style: text_style.WRAP,
        line_space: 4,
      });
      currentY += codeHeight + 16 + style.marginBottom;
      continue;
    }

    // --- Blockquote (left border + text) ---
    if (block.type === "blockquote") {
      var bqHeight = estimateTextHeight(
        block.text,
        style.size,
        textWidth - 16
      );
      container.createWidget(widget.FILL_RECT, {
        x: textX,
        y: currentY,
        w: 3,
        h: bqHeight + 4,
        color: COLORS.BLOCKQUOTE_BORDER,
      });
      container.createWidget(widget.TEXT, {
        x: textX + 12,
        y: currentY,
        w: textWidth - 16,
        h: bqHeight + 4,
        text: block.text,
        text_size: style.size,
        color: style.color,
        text_style: text_style.WRAP,
        line_space: 3,
      });
      currentY += bqHeight + 4 + style.marginBottom;
      continue;
    }

    // --- Default: text block (headings, paragraphs, lists, tables, checkboxes) ---
    var displayText = block.text;

    // Add prefixes for list items and checkboxes
    if (block.type === "ul") {
      displayText = "\u2022 " + displayText;
    } else if (block.type === "checkbox_checked") {
      displayText = "\u2713 " + displayText;
    } else if (block.type === "checkbox_unchecked") {
      displayText = "\u25CB " + displayText;
    }

    var blockHeight = estimateTextHeight(displayText, style.size, textWidth);

    container.createWidget(widget.TEXT, {
      x: textX,
      y: currentY,
      w: textWidth,
      h: blockHeight,
      text: displayText,
      text_size: style.size,
      color: style.color,
      text_style: text_style.WRAP,
      line_space: 3,
    });

    currentY += blockHeight + style.marginBottom;
  }

  return currentY + CONTENT.MARGIN_BOTTOM + 40; // Extra padding for round display bottom
}
