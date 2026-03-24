import { createWidget, widget, text_style, align, deleteWidget } from "@zos/ui";
import { COLORS } from "./colors";
import { SCREEN, CONTENT } from "./layout";

/**
 * Show a centered error message, removing the loading widget.
 */
export function showError(loadingWidget, message) {
  if (loadingWidget) deleteWidget(loadingWidget);

  createWidget(widget.TEXT, {
    x: CONTENT.MARGIN_X,
    y: SCREEN.CENTER_Y - 30,
    w: CONTENT.WIDTH,
    h: 60,
    text: "Erro: " + String(message),
    text_size: 16,
    color: 0xff5252,
    align_h: align.CENTER_H,
    text_style: text_style.WRAP,
  });
}

/**
 * Show an "Offline" indicator below the title.
 */
export function showOfflineIndicator() {
  createWidget(widget.TEXT, {
    x: CONTENT.MARGIN_X,
    y: CONTENT.MARGIN_TOP + 36,
    w: CONTENT.WIDTH,
    h: 20,
    text: "Offline \u2014 cache local",
    text_size: 12,
    color: COLORS.TEXT_DIM,
    align_h: align.CENTER_H,
  });
}

/**
 * Create and return a centered loading widget.
 */
export function createLoadingWidget(text) {
  return createWidget(widget.TEXT, {
    x: CONTENT.MARGIN_X,
    y: SCREEN.CENTER_Y - 20,
    w: CONTENT.WIDTH,
    h: 40,
    text: text || "Carregando...",
    text_size: 18,
    color: COLORS.LOADING,
    align_h: align.CENTER_H,
  });
}
